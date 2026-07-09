import { calculatePrediction } from "./predictionEngine";
import type { Scenario, StressTestRow } from "./types";

const pctDelta = (next: number, base: number) => (base ? ((next - base) / Math.abs(base)) * 100 : 0);
const round = (value: number, digits = 1) => Number(value.toFixed(digits));
const addScore = (value: number, points: number) => Math.max(0, Math.min(100, value + points));

const actionForResult = (scenario: Scenario, next: ReturnType<typeof calculatePrediction>) => {
  if (next.weightedRisk >= 70) return "Proceed only after compliance review and backup-source approval.";
  if (scenario.budget.budget > 0 && next.totalScenarioCost > scenario.budget.budget * 1.1) return "Reject current award unless price or tariff exposure is renegotiated.";
  if (scenario.budget.maxAverageLeadTime > 0 && next.avgLeadTime > scenario.budget.maxAverageLeadTime + 20) return "Dual-source with a regional backup to protect lead time.";
  if (next.serviceLevel < 82) return "Approve only with buffer inventory and secondary supplier coverage.";
  return "Plan remains usable; monitor assumptions and keep backup lane active.";
};

export const buildStressTests = (scenario: Scenario): StressTestRow[] => {
  const base = calculatePrediction(scenario);
  const tests: Array<{ id: string; question: string; assumption: string; scenario: Scenario }> = [
    {
      id: "tariff-15",
      question: "What happens if tariffs rise 15%?",
      assumption: "Adds 15 percentage points to supplier tariff rates.",
      scenario: { ...scenario, suppliers: scenario.suppliers.map((supplier) => ({ ...supplier, tariffRate: supplier.tariffRate + 15 })) },
    },
    {
      id: "lead-30",
      question: "What happens if lead time increases by 30 days?",
      assumption: "Adds 30 transit days to every active route.",
      scenario: { ...scenario, routes: scenario.routes.map((route) => (route.active ? { ...route, transitTime: route.transitTime + 30 } : route)) },
    },
    {
      id: "taiwan-china-risk",
      question: "What happens if China/Taiwan risk spikes?",
      assumption: "Adds geopolitical, delay, and customs risk to China and Taiwan suppliers and lanes.",
      scenario: {
        ...scenario,
        suppliers: scenario.suppliers.map((supplier) =>
          /china|taiwan/i.test(supplier.country)
            ? {
                ...supplier,
                politicalRisk: addScore(supplier.politicalRisk, 25),
                naturalDisasterRisk: addScore(supplier.naturalDisasterRisk, 10),
                leadTime: Math.round(supplier.leadTime + 7),
              }
            : supplier,
        ),
        routes: scenario.routes.map((route) => {
          const supplier = scenario.suppliers.find((item) => item.id === route.supplierId);
          return supplier && /china|taiwan/i.test(supplier.country)
            ? {
                ...route,
                transitTime: route.transitTime + 7,
                delayProbability: addScore(route.delayProbability, 15),
                customsRisk: addScore(route.customsRisk, 12),
                portCongestionRisk: addScore(route.portCongestionRisk, 10),
              }
            : route;
        }),
      },
    },
    {
      id: "demand-double",
      question: "What happens if demand doubles?",
      assumption: "Doubles monthly demand and forecast demand at every demand hub.",
      scenario: {
        ...scenario,
        budget: { ...scenario.budget, monthlyDemand: scenario.budget.monthlyDemand ? scenario.budget.monthlyDemand * 2 : scenario.budget.monthlyDemand },
        demandHubs: scenario.demandHubs.map((hub) => ({
          ...hub,
          monthlyDemand: hub.monthlyDemand ? hub.monthlyDemand * 2 : hub.monthlyDemand,
          forecastDemand: hub.forecastDemand ? hub.forecastDemand * 2 : hub.forecastDemand,
        })),
      },
    },
  ];

  return tests.map((test) => {
    const next = calculatePrediction(test.scenario);
    return {
      id: test.id,
      question: test.question,
      assumption: test.assumption,
      costDeltaPct: round(pctDelta(next.totalScenarioCost, base.totalScenarioCost)),
      riskDelta: round(next.weightedRisk - base.weightedRisk),
      leadTimeDelta: round(next.avgLeadTime - base.avgLeadTime),
      serviceDelta: round(next.serviceLevel - base.serviceLevel),
      recommendedAction: actionForResult(test.scenario, next),
    };
  });
};
