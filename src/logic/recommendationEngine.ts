import { calculatePrediction } from "./predictionEngine";
import { buildRecommendedAllocation, formatAllocationMix } from "./optimizationEngine";
import type { Recommendation, Scenario, Supplier, SupplierPrediction } from "./types";

const confidenceBandFor = (score: number) => (score < 60 ? "low" : score < 90 ? "medium" : "high");
const titleCase = (value: string) => `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
const listMissing = (fields: string[], limit = 4) => fields.slice(0, limit).join(", ");

const hasText = (value: string) => Boolean(value.trim());

const availableInputSummary = (scenario: Scenario) => {
  const activeRoutes = scenario.routes.filter((route) => route.active).length;
  const activeRisks = scenario.riskEvents.filter((risk) => risk.active).length;
  const product = scenario.productDetails.name || scenario.productDetails.category || scenario.productDetails.descriptors ? "product context" : "";
  return [
    scenario.suppliers.length ? `${scenario.suppliers.length} supplier${scenario.suppliers.length === 1 ? "" : "s"}` : "",
    scenario.demandHubs.length ? `${scenario.demandHubs.length} demand hub${scenario.demandHubs.length === 1 ? "" : "s"}` : "",
    activeRoutes ? `${activeRoutes} active route${activeRoutes === 1 ? "" : "s"}` : "",
    activeRisks ? `${activeRisks} active risk${activeRisks === 1 ? "" : "s"}` : "",
    scenario.budget.budget ? "budget target" : "",
    product,
  ].filter(Boolean);
};

const supplierCompleteness = (supplier: Supplier) =>
  [
    hasText(supplier.name),
    hasText(supplier.country),
    supplier.baseUnitCost > 0,
    supplier.capacity > 0,
    supplier.leadTime > 0,
    supplier.reliability > 0,
    supplier.esgScore > 0,
    supplier.financialHealth > 0,
  ].filter(Boolean).length;

const rankPartialSuppliers = (scenario: Scenario, predictions: SupplierPrediction[]) => {
  const totalDemand = Math.max(1, scenario.demandHubs.reduce((sum, hub) => sum + Math.max(0, hub.monthlyDemand || hub.forecastDemand || 0), 0) || scenario.budget.monthlyDemand || 1);
  return scenario.suppliers
    .map((supplier) => {
      const prediction = predictions.find((item) => item.supplierId === supplier.id);
      const costScore = supplier.baseUnitCost > 0 ? Math.max(0, 100 - supplier.baseUnitCost) : 45;
      const leadScore = supplier.leadTime > 0 ? Math.max(0, 100 - supplier.leadTime * 2) : 45;
      const reliabilityScore = supplier.reliability || 45;
      const riskScore = prediction ? Math.max(0, 100 - prediction.riskScore) : 45;
      const capacityScore = supplier.capacity > 0 ? Math.min(100, (supplier.capacity / totalDemand) * 100) : 45;
      const esgScore = supplier.esgScore || 45;
      const completenessBoost = supplierCompleteness(supplier) * 2;
      const score = costScore * 0.2 + leadScore * 0.18 + reliabilityScore * 0.18 + riskScore * 0.18 + capacityScore * 0.16 + esgScore * 0.1 + completenessBoost;
      return { supplier, prediction, score };
    })
    .sort((a, b) => b.score - a.score);
};

const nextInputPush = (scenario: Scenario, missingFields: string[]) => {
  if (!scenario.suppliers.length) return "Add at least two supplier records with country, cost, capacity, lead time, and reliability.";
  if (!scenario.demandHubs.length) return "Add the demand hub and monthly demand so the recommendation can size allocation.";
  if (!scenario.routes.some((route) => route.active)) return "Create at least one active supplier-to-demand route with freight cost, transit time, and allocation.";
  if (missingFields.length) return `Fill next: ${listMissing(missingFields)}.`;
  return "Review route allocation and export the decision memo.";
};

const buildPartialRecommendation = (scenario: Scenario, result: ReturnType<typeof calculatePrediction>): Recommendation => {
  const confidenceBand = confidenceBandFor(result.confidenceScore);
  const confidenceLabel = `${titleCase(confidenceBand)} (${result.confidenceScore}%)`;
  const evidence = availableInputSummary(scenario);
  const nextStep = nextInputPush(scenario, result.missingDataFields);
  const activeRisk = scenario.riskEvents.find((risk) => risk.active);
  const ranked = rankPartialSuppliers(scenario, result.suppliers);
  const top = ranked[0];
  const shortlist = ranked
    .slice(0, 3)
    .map(({ supplier }) => supplier.name || supplier.country || "Unnamed supplier")
    .join(", ");

  if (!scenario.suppliers.length) {
    const product = scenario.productDetails.name || scenario.productDetails.category || "the product";
    const demandContext = result.totalDemand ? `${result.totalDemand.toLocaleString()} units of visible demand` : "demand not entered yet";
    const riskContext = activeRisk ? ` Active risk to account for: ${activeRisk.name}.` : "";
    return {
      supplierMix: {},
      text: `Provisional recommendation: build the supplier shortlist before making an award decision for ${product}. Current context includes ${demandContext}.${riskContext} ${nextStep} This recommendation is intentionally low-confidence until supplier records, route costs, capacity, and lead-time inputs are filled.`,
      recommendedAllocation: `No supplier allocation yet. Start by adding supplier candidates for ${product}.`,
      whyThisPlan: `Based on the available ${evidence.length ? evidence.join(", ") : "blank workspace"} inputs, the model can guide the next sourcing step but cannot rank suppliers yet.`,
      recommendedAction: nextStep,
      keyTradeoff: "You can move quickly with intake data, but supplier approval should wait until supplier, route, cost, and capacity fields are complete.",
      confidence: confidenceLabel,
      missingData: result.missingDataFields,
      finalDecision: "revise",
      bestLever: "Create supplier shortlist",
      biggestRisk: activeRisk?.name ?? "No suppliers entered",
    };
  }

  const topName = top.supplier.name || top.supplier.country || "the leading supplier";
  const topReasons = [
    top.supplier.baseUnitCost > 0 ? `cost $${top.supplier.baseUnitCost.toFixed(2)}` : "",
    top.supplier.capacity > 0 ? `capacity ${top.supplier.capacity.toLocaleString()}` : "",
    top.supplier.leadTime > 0 ? `${top.supplier.leadTime}d supplier lead time` : "",
    top.supplier.reliability > 0 ? `${top.supplier.reliability}% reliability` : "",
    top.prediction?.riskScore ? `risk ${top.prediction.riskScore.toFixed(1)}` : "",
  ].filter(Boolean);
  const routeGap = scenario.routes.some((route) => route.active) ? "" : " Route data is missing, so this is not an allocation-ready plan.";
  const demandGap = result.totalDemand > 0 ? "" : " Demand volume is missing, so capacity fit cannot be fully tested.";
  return {
    supplierMix: {},
    text: `Provisional recommendation: keep ${topName} as the current front-runner from the available inputs${shortlist ? `, with shortlist view: ${shortlist}` : ""}. This is based on ${topReasons.length ? topReasons.join(", ") : "the supplier fields entered so far"}.${routeGap}${demandGap} ${nextStep} Do not treat this as approval-ready until the missing inputs are complete.`,
    recommendedAllocation: `Provisional front-runner: ${topName}. Add demand and route data before percentage allocation.`,
    whyThisPlan: `The model is using the supplier data that exists now: ${topReasons.length ? topReasons.join(", ") : evidence.join(", ") || "partial supplier records"}. Missing inputs keep the recommendation provisional.`,
    recommendedAction: `Proceed as a draft only. ${nextStep}`,
    keyTradeoff: "Early recommendations help directionally prioritize suppliers, but missing demand, route, cost, or capacity fields can change the final award.",
    confidence: confidenceLabel,
    missingData: result.missingDataFields,
    finalDecision: "revise",
    bestLever: nextStep,
    biggestRisk: activeRisk?.name ?? (result.missingDataFields[0] || "Incomplete data"),
  };
};

export const buildRecommendation = (scenario: Scenario): Recommendation => {
  const result = calculatePrediction(scenario);
  const allocation = buildRecommendedAllocation(scenario, scenario.optimizationGoal);
  const hasAllocation = Object.values(allocation).some((value) => value > 0);
  const product = scenario.productDetails;
  const productContext = [product.name, product.category === "Other" ? product.customCategory : product.category, product.descriptors, product.specification, product.complianceRequirements, product.qualityRequirements]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!hasAllocation) {
    return buildPartialRecommendation(scenario, result);
  }
  const recommendedScenario = {
    ...scenario,
    suppliers: scenario.suppliers.map((supplier) => ({
      ...supplier,
      allocation: allocation[supplier.id] ?? 0,
      included: (allocation[supplier.id] ?? 0) > 0,
    })),
  };
  const recommendedResult = calculatePrediction(recommendedScenario);
  const biggestRiskSupplier = [...result.suppliers].sort((a, b) => b.riskScore * b.allocationPct - a.riskScore * a.allocationPct)[0];
  const activeRisk = scenario.riskEvents.find((risk) => risk.active && biggestRiskSupplier?.activeRiskNames.includes(risk.name));

  let bestLever = scenario.levers.find((lever) => lever.active)?.name ?? "Add negotiation lever";
  if (scenario.budget.maxAverageLeadTime > 0 && result.avgLeadTime > scenario.budget.maxAverageLeadTime) bestLever = "Expedited shipping";
  if (scenario.budget.minServiceLevel > 0 && result.serviceLevel < scenario.budget.minServiceLevel) bestLever = "Increase buffer inventory";
  if (scenario.budget.budget > 0 && result.totalScenarioCost > scenario.budget.budget) bestLever = "Price concession";
  if (result.weightedRisk > 62) bestLever = "Contract flexibility clause";
  if (/medical|regulated|compliance|iso|iatf|aerospace|pharma|pharmaceutical/.test(productContext)) bestLever = "Supplier qualification audit";
  if (/battery|hazard|hazmat|lithium|chemical/.test(productContext)) bestLever = "Compliance documentation and certified logistics";
  if (/fragile|cold chain|temperature|perishable|sterile/.test(productContext)) bestLever = "Special handling and packaging validation";

  const decisionFromTargets =
    (scenario.budget.budget === 0 || recommendedResult.totalScenarioCost <= scenario.budget.budget) &&
    (scenario.budget.minServiceLevel === 0 || recommendedResult.serviceLevel >= scenario.budget.minServiceLevel) &&
    recommendedResult.weightedRisk < 64
      ? "approve"
      : (scenario.budget.minServiceLevel > 0 && recommendedResult.serviceLevel < scenario.budget.minServiceLevel - 5) ||
          (scenario.budget.budget > 0 && recommendedResult.totalScenarioCost > scenario.budget.budget * 1.08)
        ? "reject"
        : "revise";
  const finalDecision = result.missingDataFields.length || result.confidenceScore < 60 ? "revise" : decisionFromTargets;

  const mix = formatAllocationMix(scenario, allocation) || "no feasible supplier mix";
  const biggestRisk = activeRisk?.name ?? biggestRiskSupplier?.activeRiskNames[0] ?? `${biggestRiskSupplier?.country ?? "network"} exposure`;
  const deltaCost = recommendedResult.totalScenarioCost - result.totalScenarioCost;
  const deltaLead = recommendedResult.avgLeadTime - result.avgLeadTime;
  const confidenceBand = result.confidenceScore >= 90 ? "high" : result.confidenceScore >= 60 ? "medium" : "low";
  const confidenceLabel = `${confidenceBand[0].toUpperCase()}${confidenceBand.slice(1)} (${result.confidenceScore}%)`;
  const missingNote = result.missingDataFields.length
    ? ` Recommendation confidence is ${confidenceBand} because missing fields include ${result.missingDataFields.slice(0, 4).join(", ")}.`
    : ` Recommendation confidence is ${confidenceBand} because required supplier, demand, route, and capacity fields are complete.`;
  const productNote = product.name || product.category || product.descriptors ? ` Product context: ${product.name || "Unnamed product"}${product.category ? ` in ${product.category === "Other" ? product.customCategory || "Other" : product.category}` : ""}${product.descriptors ? ` with descriptors: ${product.descriptors.split(/\n|,/).slice(0, 3).join(", ")}` : ""}.` : "";
  const evidenceNote = `This recommendation is based on ${scenario.suppliers.length} suppliers, ${scenario.demandHubs.length} demand hubs, ${scenario.routes.filter((route) => route.active).length} active routes, ${scenario.riskEvents.filter((risk) => risk.active).length} active risk events, ${scenario.budget.budget ? `$${scenario.budget.budget.toLocaleString()} budget` : "no budget cap"}, and your selected priority of ${scenario.optimizationGoal.toLowerCase()}.${productNote}`;

  const text = `Recommended: ${mix}. ${evidenceNote} This plan targets ${scenario.optimizationGoal.toLowerCase()} while keeping average lead time near ${recommendedResult.avgLeadTime.toFixed(
    1,
  )} days and projected service level at ${recommendedResult.serviceLevel.toFixed(1)}%. Biggest risk is ${biggestRisk}, mainly affecting ${
    biggestRiskSupplier?.country ?? "the supplier network"
  }. Best next lever: ${bestLever}. Expected scenario cost is $${(recommendedResult.totalScenarioCost / 1_000_000).toFixed(
    2,
  )}M, ${deltaCost >= 0 ? "up" : "down"} $${Math.abs(deltaCost / 1_000_000).toFixed(2)}M versus the current plan; lead time is ${
    deltaLead >= 0 ? "up" : "down"
  } ${Math.abs(deltaLead).toFixed(1)} days.${missingNote} Trade-off: the recommendation improves resilience and diversification, but may preserve some premium cost to reduce disruption exposure. Final recommendation: ${finalDecision.toUpperCase()}.`;
  const backupCountries = scenario.suppliers
    .filter((supplier) => supplier.included && supplier.country && supplier.country !== biggestRiskSupplier?.country)
    .map((supplier) => supplier.country)
    .slice(0, 2);
  const nextStep = nextInputPush(scenario, result.missingDataFields);
  const baseRecommendedAction =
    finalDecision === "reject"
      ? "Reject due to tariff and lead-time exposure."
      : result.weightedRisk >= 62 || /compliance|regulated|battery|hazmat|lithium|medical|aerospace/.test(productContext)
        ? "Proceed only after compliance review."
        : backupCountries.length
          ? `Dual-source with ${backupCountries.join("/")} backup.`
          : "Approve supplier with backup source.";
  const recommendedAction = result.missingDataFields.length ? `${baseRecommendedAction} Keep as provisional until completed: ${listMissing(result.missingDataFields)}.` : baseRecommendedAction;

  return {
    supplierMix: allocation,
    text,
    recommendedAllocation: mix,
    whyThisPlan: result.missingDataFields.length
      ? `This plan follows ${scenario.optimizationGoal.toLowerCase()} using available inputs, but it is still provisional. ${nextStep}`
      : `This plan follows ${scenario.optimizationGoal.toLowerCase()} using the current supplier, demand, route, risk, product, and constraint inputs.`,
    recommendedAction,
    keyTradeoff:
      scenario.optimizationGoal === "Lowest cost"
        ? "Lower landed cost may increase lead time, concentration, or disruption exposure."
        : scenario.optimizationGoal === "Lowest risk"
          ? "Lower disruption exposure may require paying a premium or using more suppliers."
          : scenario.optimizationGoal === "Fastest lead time"
            ? "Faster delivery usually increases freight cost and can raise emissions."
            : scenario.optimizationGoal === "Best ESG"
              ? "Better ESG and lower-emission routes may increase cost or lead time."
              : scenario.optimizationGoal === "Highest resilience"
                ? "More diversification and capacity headroom may create management and cost overhead."
                : "Balanced sourcing avoids extremes but may not maximize any single metric.",
    confidence: confidenceLabel,
    missingData: result.missingDataFields,
    finalDecision,
    bestLever,
    biggestRisk,
  };
};
