import { calculatePrediction, getTotalDemand } from "./predictionEngine";
import type { OptimizationGoal, Scenario, ScenarioComparisonRow, WeightSettings } from "./types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalize = (value: number, min: number, max: number, invert = false) => {
  if (max === min) return 0.5;
  const normalized = (value - min) / (max - min);
  return invert ? 1 - normalized : normalized;
};

const goalWeights: Record<OptimizationGoal, WeightSettings> = {
  "Lowest cost": { cost: 42, leadTime: 8, risk: 12, reliability: 10, esg: 4, capacity: 12, resilience: 12 },
  "Lowest risk": { cost: 10, leadTime: 10, risk: 42, reliability: 14, esg: 6, capacity: 8, resilience: 10 },
  "Fastest lead time": { cost: 8, leadTime: 42, risk: 12, reliability: 12, esg: 4, capacity: 8, resilience: 14 },
  "Best balanced": { cost: 22, leadTime: 16, risk: 18, reliability: 16, esg: 10, capacity: 8, resilience: 10 },
  "Best ESG": { cost: 10, leadTime: 10, risk: 12, reliability: 12, esg: 42, capacity: 6, resilience: 8 },
  "Highest resilience": { cost: 10, leadTime: 10, risk: 16, reliability: 14, esg: 6, capacity: 10, resilience: 34 },
};

export const getWeightsForGoal = (goal: OptimizationGoal, current: WeightSettings) =>
  goal === "Best balanced" ? current : goalWeights[goal];

export const buildRecommendedAllocation = (scenario: Scenario, goal: OptimizationGoal = scenario.optimizationGoal) => {
  const totalDemand = getTotalDemand(scenario);
  if (!scenario.suppliers.length || !scenario.demandHubs.length || !scenario.routes.some((route) => route.active) || totalDemand <= 0) return {};
  const prediction = calculatePrediction(scenario);
  const candidates = prediction.suppliers.filter((supplier) => {
    const source = scenario.suppliers.find((item) => item.id === supplier.supplierId);
    const hasCompleteRoute = scenario.routes.some(
      (route) =>
        route.active &&
        route.supplierId === supplier.supplierId &&
        Boolean(route.demandHubId) &&
        route.allocationPct > 0 &&
        route.freightCost > 0 &&
        route.transitTime > 0,
    );
    return Boolean(
      source?.included &&
        hasCompleteRoute &&
        source.baseUnitCost > 0 &&
        source.capacity > 0 &&
        source.leadTime > 0 &&
        source.reliability > 0 &&
        source.capacity >= source.moq,
    );
  });
  if (!candidates.length) return {};

  const ranges = {
    cost: [Math.min(...candidates.map((supplier) => supplier.landedCost)), Math.max(...candidates.map((supplier) => supplier.landedCost))],
    leadTime: [Math.min(...candidates.map((supplier) => supplier.leadTime)), Math.max(...candidates.map((supplier) => supplier.leadTime))],
    risk: [Math.min(...candidates.map((supplier) => supplier.riskScore)), Math.max(...candidates.map((supplier) => supplier.riskScore))],
    reliability: [Math.min(...candidates.map((supplier) => supplier.reliability)), Math.max(...candidates.map((supplier) => supplier.reliability))],
    esg: [Math.min(...candidates.map((supplier) => supplier.esgScore)), Math.max(...candidates.map((supplier) => supplier.esgScore))],
    capacity: [Math.min(...candidates.map((supplier) => supplier.capacityHeadroom)), Math.max(...candidates.map((supplier) => supplier.capacityHeadroom))],
  };
  const weights = getWeightsForGoal(goal, scenario.weights);
  const scored = candidates
    .map((supplier) => {
      const score =
        weights.cost * normalize(supplier.landedCost, ranges.cost[0], ranges.cost[1], true) +
        weights.leadTime * normalize(supplier.leadTime, ranges.leadTime[0], ranges.leadTime[1], true) +
        weights.risk * normalize(supplier.riskScore, ranges.risk[0], ranges.risk[1], true) +
        weights.reliability * normalize(supplier.reliability, ranges.reliability[0], ranges.reliability[1]) +
        weights.esg * normalize(supplier.esgScore, ranges.esg[0], ranges.esg[1]) +
        weights.capacity * normalize(supplier.capacityHeadroom, ranges.capacity[0], ranges.capacity[1]) +
        weights.resilience * (supplier.activeRiskNames.length ? 0.52 : 0.9);
      return { supplier, score: Math.max(1, score) };
    })
    .sort((a, b) => b.score - a.score);

  const result: Record<string, number> = {};
  let remaining = 100;
  const maxAllocation = scenario.budget.maxSupplierAllocation || 100;

  scored.forEach(({ supplier, score }, index) => {
    if (remaining <= 0) {
      result[supplier.supplierId] = 0;
      return;
    }
    const capacityLimit = (scenario.suppliers.find((item) => item.id === supplier.supplierId)?.capacity ?? 0) / Math.max(1, totalDemand);
    const capacityPct = clamp(capacityLimit * 100, 0, 100);
    const target = (score / scored.reduce((sum, item) => sum + item.score, 0)) * 100;
    const minViable = index < Math.min(3, scored.length) ? 8 : 0;
    const allocation = clamp(Math.max(target, minViable), 0, Math.min(maxAllocation, capacityPct, remaining));
    result[supplier.supplierId] = Number(allocation.toFixed(1));
    remaining -= allocation;
  });

  let safety = 0;
  while (remaining > 0.1 && safety < 50) {
    for (const { supplier } of scored) {
      const current = result[supplier.supplierId] ?? 0;
      const source = scenario.suppliers.find((item) => item.id === supplier.supplierId);
      const capacityPct = ((source?.capacity ?? 0) / Math.max(1, totalDemand)) * 100;
      const room = Math.min(maxAllocation, capacityPct) - current;
      if (room <= 0) continue;
      const add = Math.min(room, remaining, 1.5);
      result[supplier.supplierId] = Number((current + add).toFixed(1));
      remaining -= add;
      if (remaining <= 0.1) break;
    }
    safety += 1;
  }

  return result;
};

export const applyAllocation = (scenario: Scenario, allocation: Record<string, number>): Scenario => ({
  ...scenario,
  suppliers: scenario.suppliers.map((supplier) => ({
    ...supplier,
    allocation: Number((allocation[supplier.id] ?? 0).toFixed(1)),
    included: (allocation[supplier.id] ?? 0) > 0,
  })),
  updatedAt: new Date().toISOString(),
});

const rowFromScenario = (name: string, scenario: Scenario): ScenarioComparisonRow => {
  const result = calculatePrediction(scenario);
  return {
    name,
    totalCost: result.totalScenarioCost,
    avgLandedCost: result.avgLandedCost,
    avgLeadTime: result.avgLeadTime,
    riskScore: result.weightedRisk,
    serviceLevel: result.serviceLevel,
    esg: result.esgAverage,
    resilience: result.resilienceScore,
    capacityUtilization: result.capacityUtilization,
  };
};

export const buildComparisonRows = (scenario: Scenario): ScenarioComparisonRow[] => {
  const recommended = applyAllocation(scenario, buildRecommendedAllocation(scenario, scenario.optimizationGoal));
  const lowestCost = applyAllocation(scenario, buildRecommendedAllocation(scenario, "Lowest cost"));
  const lowestRisk = applyAllocation(scenario, buildRecommendedAllocation(scenario, "Lowest risk"));
  const fastest = applyAllocation(scenario, buildRecommendedAllocation(scenario, "Fastest lead time"));
  return [
    rowFromScenario("Current plan", scenario),
    rowFromScenario("AI recommended plan", recommended),
    rowFromScenario("Lowest cost plan", lowestCost),
    rowFromScenario("Lowest risk plan", lowestRisk),
    rowFromScenario("Fastest delivery plan", fastest),
  ];
};

export const formatAllocationMix = (scenario: Scenario, allocation: Record<string, number>) =>
  Object.entries(allocation)
    .filter(([, pct]) => pct > 0.5)
    .sort((a, b) => b[1] - a[1])
    .map(([id, pct]) => `${pct.toFixed(0)}% ${scenario.suppliers.find((supplier) => supplier.id === id)?.country ?? id}`)
    .join(", ");
