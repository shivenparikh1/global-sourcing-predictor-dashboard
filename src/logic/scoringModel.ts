import type { ConfidenceBand, PredictionResult, Scenario, SupplierPrediction, SupplierScorecard, WeightSettings } from "./types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalize = (value: number, min: number, max: number, invert = false) => {
  if (max === min) return 75;
  const normalized = ((value - min) / (max - min)) * 100;
  return clamp(invert ? 100 - normalized : normalized, 0, 100);
};

const confidenceFromScore = (score: number): ConfidenceBand => {
  if (score >= 86) return "High";
  if (score >= 60) return "Medium";
  return "Low";
};

export const sourceNoteForScenario = (scenario: Scenario) => {
  if (scenario.id === "example-command-center") return "Mock example data. No external source citations are attached.";
  if (scenario.importedFiles.length) {
    const fileList = scenario.importedFiles.slice(0, 3).map((file) => file.fileName).join(", ");
    return `Manual/imported data from ${fileList}. Source citations are not verified unless attached in notes.`;
  }
  return "Manual prototype inputs. No external source citations are attached yet.";
};

const supplierCompleteness = (scenario: Scenario, supplier: SupplierPrediction) => {
  const source = scenario.suppliers.find((item) => item.id === supplier.supplierId);
  const hasCompleteRoute = scenario.routes.some((route) => route.active && route.supplierId === supplier.supplierId && route.freightCost > 0 && route.transitTime > 0);
  const checks = [
    Boolean(source?.name),
    Boolean(source?.country),
    (source?.baseUnitCost ?? 0) > 0,
    (source?.capacity ?? 0) > 0,
    (source?.leadTime ?? 0) > 0,
    (source?.reliability ?? 0) > 0,
    hasCompleteRoute,
    scenario.demandHubs.some((hub) => (hub.monthlyDemand || hub.forecastDemand) > 0),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

const recommendedSupplierAction = (supplier: SupplierPrediction, score: number, confidence: ConfidenceBand, scenario: Scenario) => {
  const source = scenario.suppliers.find((item) => item.id === supplier.supplierId);
  const backup = predictionBackupCountry(supplier, scenario);
  if (confidence === "Low") return "Proceed only after missing source data is completed.";
  if (score >= 78 && supplier.riskScore < 54 && supplier.leadTime <= 45) return backup ? `Approve supplier with ${backup} backup source.` : "Approve supplier with backup source.";
  if ((source?.tariffRate ?? 0) >= 12 || supplier.leadTime > 60) return "Reject due to tariff and lead-time exposure.";
  if (supplier.riskScore >= 62 || supplier.activeRiskNames.length) return "Proceed only after compliance review.";
  return backup ? `Dual-source with ${backup} backup.` : "Dual-source with a qualified backup.";
};

const predictionBackupCountry = (supplier: SupplierPrediction, scenario: Scenario) => {
  const candidates = scenario.suppliers
    .filter((item) => item.id !== supplier.supplierId && item.included && item.country && item.country !== supplier.country)
    .sort((a, b) => b.reliability + b.esgScore - (a.reliability + a.esgScore));
  return candidates[0]?.country;
};

const scoreCategory = (label: string, score: number, weight: number, direction: string) => ({
  label,
  score: Math.round(clamp(score, 0, 100)),
  weight,
  direction,
});

export const buildSupplierScorecards = (scenario: Scenario, prediction: PredictionResult): SupplierScorecard[] => {
  const suppliers = prediction.suppliers.filter((supplier) => supplier.included || supplier.allocationUnits > 0 || scenario.routes.some((route) => route.supplierId === supplier.supplierId));
  if (!suppliers.length) return [];

  const ranges = {
    cost: [Math.min(...suppliers.map((supplier) => supplier.landedCost || 0)), Math.max(...suppliers.map((supplier) => supplier.landedCost || 0))],
    leadTime: [Math.min(...suppliers.map((supplier) => supplier.leadTime || 0)), Math.max(...suppliers.map((supplier) => supplier.leadTime || 0))],
    risk: [Math.min(...suppliers.map((supplier) => supplier.riskScore || 0)), Math.max(...suppliers.map((supplier) => supplier.riskScore || 0))],
    reliability: [Math.min(...suppliers.map((supplier) => supplier.reliability || 0)), Math.max(...suppliers.map((supplier) => supplier.reliability || 0))],
    esg: [Math.min(...suppliers.map((supplier) => supplier.esgScore || 0)), Math.max(...suppliers.map((supplier) => supplier.esgScore || 0))],
    capacity: [Math.min(...suppliers.map((supplier) => supplier.capacityHeadroom || 0)), Math.max(...suppliers.map((supplier) => supplier.capacityHeadroom || 0))],
  };
  const weights = scenario.weights;
  const weightTotal = Math.max(1, Object.values(weights).reduce((sum, value) => sum + value, 0));
  const sourceNote = sourceNoteForScenario(scenario);

  return suppliers
    .map((supplier) => {
      const categories = [
        scoreCategory("Landed Cost", normalize(supplier.landedCost, ranges.cost[0], ranges.cost[1], true), weights.cost, "Lower cost scores higher"),
        scoreCategory("Lead Time", normalize(supplier.leadTime, ranges.leadTime[0], ranges.leadTime[1], true), weights.leadTime, "Shorter lead time scores higher"),
        scoreCategory("Risk", normalize(supplier.riskScore, ranges.risk[0], ranges.risk[1], true), weights.risk, "Lower country, route, and event risk scores higher"),
        scoreCategory("Reliability", normalize(supplier.reliability, ranges.reliability[0], ranges.reliability[1]), weights.reliability, "Higher OTIF reliability scores higher"),
        scoreCategory("ESG", normalize(supplier.esgScore, ranges.esg[0], ranges.esg[1]), weights.esg, "Higher ESG score and lower emissions score higher"),
        scoreCategory("Capacity", normalize(supplier.capacityHeadroom, ranges.capacity[0], ranges.capacity[1]), weights.capacity, "More headroom scores higher"),
        scoreCategory("Resilience", supplier.activeRiskNames.length ? 55 : 90, weights.resilience, "Fewer active disruptions and more network resilience score higher"),
      ];
      const score = Math.round(categories.reduce((sum, item) => sum + item.score * item.weight, 0) / weightTotal);
      const completeness = supplierCompleteness(scenario, supplier);
      const confidence = confidenceFromScore(Math.min(prediction.confidenceScore, completeness));
      return {
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName || "Unnamed supplier",
        country: supplier.country,
        score,
        confidence,
        sourceNote,
        recommendedAction: recommendedSupplierAction(supplier, score, confidence, scenario),
        assumptions: buildScoringAssumptions(scenario, supplier),
        categories,
        formula: "Supplier score = weighted average of category scores using the current optimization weights.",
      };
    })
    .sort((a, b) => b.score - a.score);
};

const buildScoringAssumptions = (scenario: Scenario, supplier: SupplierPrediction) => {
  const source = scenario.suppliers.find((item) => item.id === supplier.supplierId);
  return [
    "Landed cost includes unit cost, freight, tariff, insurance, risk premium, and active lever effects.",
    "Risk score combines country risk, route delay/customs/congestion risk, active risk events, and supplier concentration.",
    `Current weights: ${formatWeights(scenario.weights)}.`,
    source?.notes ? `Supplier note: ${source.notes}` : "Supplier note is blank.",
  ];
};

const formatWeights = (weights: WeightSettings) =>
  [
    `Cost ${weights.cost}`,
    `Lead ${weights.leadTime}`,
    `Risk ${weights.risk}`,
    `Reliability ${weights.reliability}`,
    `ESG ${weights.esg}`,
    `Capacity ${weights.capacity}`,
    `Resilience ${weights.resilience}`,
  ].join(" / ");
