import { calculatePrediction } from "./predictionEngine";
import { buildRecommendedAllocation, formatAllocationMix } from "./optimizationEngine";
import type { Recommendation, Scenario } from "./types";

export const buildRecommendation = (scenario: Scenario): Recommendation => {
  const result = calculatePrediction(scenario);
  const allocation = buildRecommendedAllocation(scenario, scenario.optimizationGoal);
  const product = scenario.productDetails;
  const productContext = [product.name, product.category === "Other" ? product.customCategory : product.category, product.descriptors, product.specification, product.complianceRequirements, product.qualityRequirements]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!Object.keys(allocation).length) {
    const missing = result.missingDataFields.length ? ` Missing data reducing confidence: ${result.missingDataFields.slice(0, 5).join(", ")}.` : "";
    return {
      supplierMix: {},
      text:
        `Predictions will appear once you add at least one demand hub, one supplier, and one active supplier-to-demand route. Add supplier cost, demand volume, route cost, lead time, and capacity to generate a sourcing recommendation. Recommendation confidence is ${result.confidenceScore < 60 ? "low" : result.confidenceScore < 90 ? "medium" : "high"} at ${result.confidenceScore}%.${missing}`,
      recommendedAllocation: "No feasible supplier allocation yet.",
      whyThisPlan: "The sourcing network is incomplete, so the model is waiting for supplier, demand, route, cost, lead-time, and capacity inputs.",
      recommendedAction: "Add supplier, demand, route, cost, capacity, and lead-time inputs before making an award decision.",
      keyTradeoff: "Speed of setup versus recommendation confidence.",
      confidence: `${result.confidenceScore < 60 ? "Low" : result.confidenceScore < 90 ? "Medium" : "High"} (${result.confidenceScore}%)`,
      missingData: result.missingDataFields,
      finalDecision: "revise",
      bestLever: "Add negotiation levers",
      biggestRisk: "Network is incomplete",
    };
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

  const finalDecision =
    (scenario.budget.budget === 0 || recommendedResult.totalScenarioCost <= scenario.budget.budget) &&
    (scenario.budget.minServiceLevel === 0 || recommendedResult.serviceLevel >= scenario.budget.minServiceLevel) &&
    recommendedResult.weightedRisk < 64
      ? "approve"
      : (scenario.budget.minServiceLevel > 0 && recommendedResult.serviceLevel < scenario.budget.minServiceLevel - 5) ||
          (scenario.budget.budget > 0 && recommendedResult.totalScenarioCost > scenario.budget.budget * 1.08)
        ? "reject"
        : "revise";

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
  const recommendedAction =
    finalDecision === "reject"
      ? "Reject due to tariff and lead-time exposure."
      : result.weightedRisk >= 62 || /compliance|regulated|battery|hazmat|lithium|medical|aerospace/.test(productContext)
        ? "Proceed only after compliance review."
        : backupCountries.length
          ? `Dual-source with ${backupCountries.join("/")} backup.`
          : "Approve supplier with backup source.";

  return {
    supplierMix: allocation,
    text,
    recommendedAllocation: mix,
    whyThisPlan: `This plan follows ${scenario.optimizationGoal.toLowerCase()} using the current supplier, demand, route, risk, product, and constraint inputs.`,
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
