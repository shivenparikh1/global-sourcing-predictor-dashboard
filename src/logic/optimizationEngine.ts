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
  goal === "Best balanced" ? goalWeights[goal] ?? current : goalWeights[goal];

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

export const applyAllocation = (scenario: Scenario, allocation: Record<string, number>): Scenario => {
  const updatedSuppliers = scenario.suppliers.map((supplier) => {
    const allocationPct = Number((allocation[supplier.id] ?? 0).toFixed(1));
    return {
      ...supplier,
      allocation: allocationPct,
      included: allocationPct > 0,
    };
  });

  const updatedRoutes = scenario.routes.map((route) => {
    if (!route.active || !route.demandHubId) return route;
    const siblingRoutes = scenario.routes.filter((item) => item.active && item.demandHubId === route.demandHubId);
    const desiredTotal = siblingRoutes.reduce((sum, item) => sum + Math.max(0, allocation[item.supplierId] ?? 0), 0);
    if (desiredTotal <= 0) return { ...route, allocationPct: 0 };
    const routeShare = ((allocation[route.supplierId] ?? 0) / desiredTotal) * 100;
    return { ...route, allocationPct: Number(clamp(routeShare, 0, 100).toFixed(1)) };
  });

  return {
    ...scenario,
    suppliers: updatedSuppliers,
    routes: updatedRoutes,
    updatedAt: new Date().toISOString(),
  };
};

const adjustPct = (value: number, pct: number) => Number(Math.max(0, value * (1 + pct / 100)).toFixed(2));
const adjustScore = (value: number, points: number) => Number(clamp(value + points, 0, 100).toFixed(1));

export const applyPlanTradeoffModel = (scenario: Scenario, goal: OptimizationGoal): Scenario => {
  const weightedScenario: Scenario = {
    ...scenario,
    optimizationGoal: goal,
    weights: goalWeights[goal] ?? scenario.weights,
    budget: {
      ...scenario.budget,
      maxSupplierAllocation:
        goal === "Highest resilience"
          ? Math.min(scenario.budget.maxSupplierAllocation || 45, 45)
          : goal === "Lowest cost"
            ? scenario.budget.maxSupplierAllocation || 85
            : scenario.budget.maxSupplierAllocation,
    },
  };

  if (goal === "Best balanced") return weightedScenario;

  return {
    ...weightedScenario,
    suppliers: weightedScenario.suppliers.map((supplier) => {
      if (goal === "Lowest cost") {
        return {
          ...supplier,
          baseUnitCost: adjustPct(supplier.baseUnitCost, -6),
          leadTime: adjustPct(supplier.leadTime, 8),
          reliability: adjustScore(supplier.reliability, -2),
          politicalRisk: adjustScore(supplier.politicalRisk, 3),
          currencyRisk: adjustScore(supplier.currencyRisk, 2),
        };
      }
      if (goal === "Lowest risk") {
        return {
          ...supplier,
          baseUnitCost: adjustPct(supplier.baseUnitCost, 4),
          reliability: adjustScore(supplier.reliability, 3),
          politicalRisk: adjustScore(supplier.politicalRisk, -7),
          currencyRisk: adjustScore(supplier.currencyRisk, -5),
          naturalDisasterRisk: adjustScore(supplier.naturalDisasterRisk, -5),
          financialHealth: adjustScore(supplier.financialHealth, 2),
        };
      }
      if (goal === "Fastest lead time") {
        return {
          ...supplier,
          baseUnitCost: adjustPct(supplier.baseUnitCost, 2),
          leadTime: adjustPct(supplier.leadTime, -16),
          reliability: adjustScore(supplier.reliability, 1),
        };
      }
      if (goal === "Best ESG") {
        return {
          ...supplier,
          baseUnitCost: adjustPct(supplier.baseUnitCost, 3),
          esgScore: adjustScore(supplier.esgScore, 8),
          reliability: adjustScore(supplier.reliability, 1),
        };
      }
      return {
        ...supplier,
        baseUnitCost: adjustPct(supplier.baseUnitCost, 3),
        reliability: adjustScore(supplier.reliability, 2),
        capacity: Math.round(supplier.capacity * 1.1),
        politicalRisk: adjustScore(supplier.politicalRisk, -3),
        currencyRisk: adjustScore(supplier.currencyRisk, -3),
        naturalDisasterRisk: adjustScore(supplier.naturalDisasterRisk, -3),
      };
    }),
    routes: weightedScenario.routes.map((route) => {
      if (goal === "Lowest cost") {
        return {
          ...route,
          freightCost: adjustPct(route.freightCost, -8),
          transitTime: adjustPct(route.transitTime, 10),
          delayProbability: adjustScore(route.delayProbability, 5),
          customsRisk: adjustScore(route.customsRisk, 3),
          portCongestionRisk: adjustScore(route.portCongestionRisk, 3),
        };
      }
      if (goal === "Lowest risk") {
        return {
          ...route,
          freightCost: adjustPct(route.freightCost, 6),
          transitTime: adjustPct(route.transitTime, -3),
          delayProbability: adjustScore(route.delayProbability, -9),
          customsRisk: adjustScore(route.customsRisk, -8),
          portCongestionRisk: adjustScore(route.portCongestionRisk, -8),
        };
      }
      if (goal === "Fastest lead time") {
        return {
          ...route,
          freightCost: adjustPct(route.freightCost, 18),
          transitTime: adjustPct(route.transitTime, -32),
          delayProbability: adjustScore(route.delayProbability, -4),
          emissionsFactor: adjustPct(route.emissionsFactor, 14),
        };
      }
      if (goal === "Best ESG") {
        return {
          ...route,
          freightCost: adjustPct(route.freightCost, 5),
          transitTime: adjustPct(route.transitTime, 6),
          emissionsFactor: adjustPct(route.emissionsFactor, -28),
          portCongestionRisk: adjustScore(route.portCongestionRisk, -3),
        };
      }
      return {
        ...route,
        freightCost: adjustPct(route.freightCost, 4),
        delayProbability: adjustScore(route.delayProbability, -5),
        customsRisk: adjustScore(route.customsRisk, -4),
        portCongestionRisk: adjustScore(route.portCongestionRisk, -4),
      };
    }),
  };
};

export const buildOptimizedScenarioForGoal = (scenario: Scenario, goal: OptimizationGoal): Scenario => {
  const modeled = applyPlanTradeoffModel(scenario, goal);
  return applyAllocation(modeled, buildRecommendedAllocation(modeled, goal));
};

const tradeoffForGoal = (goal: OptimizationGoal) => {
  if (goal === "Lowest cost") return "Cost down; risk and lead time may rise.";
  if (goal === "Lowest risk") return "Risk down; cost and supplier-management effort rise.";
  if (goal === "Fastest lead time") return "Lead time down; freight cost and emissions rise.";
  if (goal === "Best ESG") return "ESG and emissions improve; cost or lead time may rise.";
  if (goal === "Highest resilience") return "Resilience up; allocation spreads and cost overhead rise.";
  return "Balanced tradeoff across cost, risk, speed, service, ESG, and resilience.";
};

const rowFromScenario = (name: string, scenario: Scenario, mainTradeoff: string): ScenarioComparisonRow => {
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
    mainTradeoff,
  };
};

export const buildComparisonRows = (scenario: Scenario): ScenarioComparisonRow[] => {
  const balanced = buildOptimizedScenarioForGoal(scenario, "Best balanced");
  const lowestCost = buildOptimizedScenarioForGoal(scenario, "Lowest cost");
  const lowestRisk = buildOptimizedScenarioForGoal(scenario, "Lowest risk");
  const fastest = buildOptimizedScenarioForGoal(scenario, "Fastest lead time");
  const highestResilience = buildOptimizedScenarioForGoal(scenario, "Highest resilience");
  const bestEsg = buildOptimizedScenarioForGoal(scenario, "Best ESG");
  return [
    rowFromScenario("Current plan", scenario, "Current entered allocation and assumptions."),
    rowFromScenario("Balanced plan", balanced, tradeoffForGoal("Best balanced")),
    rowFromScenario("Lowest cost plan", lowestCost, tradeoffForGoal("Lowest cost")),
    rowFromScenario("Lowest risk plan", lowestRisk, tradeoffForGoal("Lowest risk")),
    rowFromScenario("Fastest delivery plan", fastest, tradeoffForGoal("Fastest lead time")),
    rowFromScenario("Highest resilience plan", highestResilience, tradeoffForGoal("Highest resilience")),
    rowFromScenario("Best ESG plan", bestEsg, tradeoffForGoal("Best ESG")),
  ];
};

export const formatAllocationMix = (scenario: Scenario, allocation: Record<string, number>) =>
  Object.entries(allocation)
    .filter(([, pct]) => pct > 0.5)
    .sort((a, b) => b[1] - a[1])
    .map(([id, pct]) => `${pct.toFixed(0)}% ${scenario.suppliers.find((supplier) => supplier.id === id)?.country ?? id}`)
    .join(", ");
