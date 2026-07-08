import { applyAllocation, buildRecommendedAllocation } from "./optimizationEngine";
import { calculatePrediction } from "./predictionEngine";
import type { OptimizationGoal, PredictionResult, Recommendation, Scenario, ScenarioComparisonRow, WeightSettings } from "./types";

export type SourcingStrategy =
  | "lowest-cost"
  | "fastest-delivery"
  | "risk-first"
  | "esg-first"
  | "highest-resilience"
  | "dual-sourcing"
  | "nearshoring"
  | "best-cost-country"
  | "emergency"
  | "balanced";

export type ReportType =
  | "decision-memo"
  | "supplier-comparison"
  | "rfq-template"
  | "supplier-scorecard"
  | "landed-cost"
  | "risk-mitigation"
  | "negotiation-plan"
  | "executive-summary"
  | "scenario-comparison";

export interface IntakeState {
  productCategory: string;
  monthlyDemand: number;
  demandRegions: string;
  priority: "cost" | "speed" | "risk" | "esg" | "resilience" | "balanced";
  sourcingMotion: "single sourcing" | "dual sourcing" | "nearshoring" | "resourcing" | "emergency sourcing" | "new product sourcing";
  maxLeadTime: number;
  budget: number;
  preferredRegions: string;
  allowedRegions: string;
  restrictedRegions: string;
  riskConcerns: string;
}

export interface DataQualityCheck {
  key: string;
  label: string;
  complete: boolean;
  fix: string;
}

export interface DataQualityScore {
  score: number;
  band: "low" | "medium" | "high";
  reliable: boolean;
  explanation: string;
  nextBestAction: string;
  missingFields: string[];
  recommendedFixes: string[];
  checks: DataQualityCheck[];
}

export interface WorkflowStage {
  id: string;
  title: string;
  status: "complete" | "incomplete" | "warning";
  requiredInputs: string[];
  missingInputs: string[];
  whyItMatters: string;
  nextBestAction: string;
  actionLabel: string;
  action: "intake" | "product" | "data" | "supplier" | "demand" | "route" | "risk" | "lever" | "forecast" | "recommendations" | "reports";
}

export interface RecommendationExplanation {
  supplierMixByDemandHub: string[];
  whySelected: string;
  biggestTradeoff: string;
  costReasoning: string;
  leadTimeReasoning: string;
  riskReasoning: string;
  serviceReasoning: string;
  esgReasoning: string;
  resilienceReasoning: string;
}

export const createBlankIntake = (): IntakeState => ({
  productCategory: "",
  monthlyDemand: 0,
  demandRegions: "",
  priority: "balanced",
  sourcingMotion: "new product sourcing",
  maxLeadTime: 0,
  budget: 0,
  preferredRegions: "",
  allowedRegions: "",
  restrictedRegions: "",
  riskConcerns: "",
});

export const strategyOptions: Array<{
  id: SourcingStrategy;
  label: string;
  goal: OptimizationGoal;
  weights: WeightSettings;
  description: string;
}> = [
  { id: "lowest-cost", label: "Lowest Cost Sourcing", goal: "Lowest cost", weights: { cost: 44, leadTime: 8, risk: 10, reliability: 10, esg: 4, capacity: 12, resilience: 12 }, description: "Prioritizes landed cost and uses risk as a guardrail." },
  { id: "fastest-delivery", label: "Fastest Delivery Sourcing", goal: "Fastest lead time", weights: { cost: 8, leadTime: 44, risk: 10, reliability: 16, esg: 4, capacity: 8, resilience: 10 }, description: "Prioritizes transit speed, supplier lead time, and reliability." },
  { id: "risk-first", label: "Risk-First Sourcing", goal: "Lowest risk", weights: { cost: 10, leadTime: 10, risk: 44, reliability: 14, esg: 6, capacity: 6, resilience: 10 }, description: "Prefers lower disruption exposure over the lowest unit cost." },
  { id: "esg-first", label: "ESG-First Sourcing", goal: "Best ESG", weights: { cost: 10, leadTime: 10, risk: 12, reliability: 12, esg: 44, capacity: 4, resilience: 8 }, description: "Prioritizes ESG score and lower-emission lane choices." },
  { id: "highest-resilience", label: "Highest Resilience Sourcing", goal: "Highest resilience", weights: { cost: 8, leadTime: 10, risk: 16, reliability: 16, esg: 6, capacity: 10, resilience: 34 }, description: "Rewards diversified regions, modes, capacity headroom, and reliability." },
  { id: "dual-sourcing", label: "Dual Sourcing", goal: "Highest resilience", weights: { cost: 10, leadTime: 10, risk: 18, reliability: 16, esg: 6, capacity: 12, resilience: 28 }, description: "Encourages at least two qualified suppliers and limits concentration." },
  { id: "nearshoring", label: "Nearshoring", goal: "Fastest lead time", weights: { cost: 12, leadTime: 28, risk: 18, reliability: 16, esg: 6, capacity: 8, resilience: 12 }, description: "Favors shorter, more controllable lead times and lower logistics exposure." },
  { id: "best-cost-country", label: "Best-Cost Country Sourcing", goal: "Best balanced", weights: { cost: 28, leadTime: 12, risk: 18, reliability: 14, esg: 8, capacity: 10, resilience: 10 }, description: "Balances low-cost regions with reliability and risk guardrails." },
  { id: "emergency", label: "Emergency Sourcing", goal: "Fastest lead time", weights: { cost: 6, leadTime: 42, risk: 12, reliability: 22, esg: 2, capacity: 8, resilience: 8 }, description: "Prioritizes speed, reliability, and available capacity over savings." },
  { id: "balanced", label: "Balanced Sourcing", goal: "Best balanced", weights: { cost: 22, leadTime: 16, risk: 18, reliability: 16, esg: 10, capacity: 8, resilience: 10 }, description: "Keeps cost, speed, risk, service, ESG, and resilience in balance." },
];

export const suggestedCopilotQuestions = [
  "What should I do next?",
  "What data is missing?",
  "Why is this supplier risky?",
  "Which route is causing the most risk?",
  "How can I lower landed cost?",
  "How can I improve service level?",
  "How can I improve resilience?",
  "Which supplier should I negotiate with?",
  "What is the biggest weakness in this plan?",
  "Generate a sourcing recommendation summary.",
];

export const reportTypes: Array<{ id: ReportType; label: string }> = [
  { id: "decision-memo", label: "Sourcing Decision Memo" },
  { id: "supplier-comparison", label: "Supplier Comparison Report" },
  { id: "rfq-template", label: "RFQ Template" },
  { id: "supplier-scorecard", label: "Supplier Scorecard" },
  { id: "landed-cost", label: "Landed Cost Breakdown" },
  { id: "risk-mitigation", label: "Risk Mitigation Plan" },
  { id: "negotiation-plan", label: "Negotiation Plan" },
  { id: "executive-summary", label: "Executive Summary" },
  { id: "scenario-comparison", label: "Scenario Comparison Report" },
];

export const riskMitigationPlaybook: Array<{ category: string; mitigations: string[] }> = [
  { category: "Geopolitical Conflict", mitigations: ["dual source", "reduce allocation to affected region", "qualify backup supplier", "nearshore part of demand", "add contract flexibility"] },
  { category: "Tariff and Sanctions Risk", mitigations: ["model tariff scenarios", "validate HS codes", "qualify alternate country", "add pass-through clauses", "increase compliance review"] },
  { category: "Port Congestion", mitigations: ["use alternate port", "switch urgent volume to air", "increase safety stock", "adjust delivery window", "split allocation across routes"] },
  { category: "Labor Strike", mitigations: ["pre-book alternate carrier capacity", "increase buffer stock", "shift lanes temporarily", "add expedited recovery option", "monitor union calendar"] },
  { category: "Weather Disruption", mitigations: ["pre-position inventory", "create alternate lane", "build weather watchlist", "increase safety stock", "add flexible delivery window"] },
  { category: "Natural Disaster", mitigations: ["dual source outside region", "reserve backup capacity", "map facility exposure", "raise safety stock", "create recovery SLA"] },
  { category: "Currency Volatility", mitigations: ["hedge currency exposure", "renegotiate payment terms", "index pricing", "diversify currency mix", "shorten quote validity"] },
  { category: "Supplier Financial Risk", mitigations: ["request financial updates", "reduce allocation", "qualify backup supplier", "tighten milestone payments", "add continuity clause"] },
  { category: "Customs Delay", mitigations: ["pre-clear documentation", "use customs broker", "validate Incoterms", "add alternate entry point", "increase compliance checks"] },
  { category: "Quality Failure", mitigations: ["increase inspection", "require corrective action", "add PPAP/FAI gate", "use backup supplier", "tie payment to quality metrics"] },
  { category: "Capacity Shortage", mitigations: ["reserve capacity", "split allocation", "onboard backup supplier", "increase forecast visibility", "reduce MOQ dependency"] },
  { category: "Fuel Price Spike", mitigations: ["renegotiate freight index", "consolidate shipments", "shift mode where viable", "review carrier mix", "add fuel surcharge cap"] },
  { category: "Shipping Lane Disruption", mitigations: ["activate alternate lane", "split allocation across routes", "book priority capacity", "use multimodal option", "increase inventory cover"] },
];

export const getStrategyConfig = (strategy: SourcingStrategy) => strategyOptions.find((option) => option.id === strategy) ?? strategyOptions[strategyOptions.length - 1];

export const applyStrategyToScenario = (scenario: Scenario, strategy: SourcingStrategy): Scenario => {
  const config = getStrategyConfig(strategy);
  const maxSupplierAllocation = strategy === "dual-sourcing" ? Math.min(scenario.budget.maxSupplierAllocation || 60, 60) : scenario.budget.maxSupplierAllocation;
  return {
    ...scenario,
    optimizationGoal: config.goal,
    weights: config.weights,
    budget: { ...scenario.budget, maxSupplierAllocation },
  };
};

export const priorityToStrategy = (priority: IntakeState["priority"]): SourcingStrategy => {
  if (priority === "cost") return "lowest-cost";
  if (priority === "speed") return "fastest-delivery";
  if (priority === "risk") return "risk-first";
  if (priority === "esg") return "esg-first";
  if (priority === "resilience") return "highest-resilience";
  return "balanced";
};

const toTitleLabel = (value: string) => value.replace(/\b\w/g, (char) => char.toUpperCase());

export const applyIntakeToScenario = (scenario: Scenario, intake: IntakeState): Scenario => {
  const strategy = priorityToStrategy(intake.priority);
  const configured = applyStrategyToScenario(scenario, strategy);
  const notes = [
    intake.productCategory ? `Product Category: ${intake.productCategory}` : "",
    intake.demandRegions ? `Demand Regions: ${intake.demandRegions}` : "",
    intake.sourcingMotion ? `Sourcing Motion: ${toTitleLabel(intake.sourcingMotion)}` : "",
    intake.preferredRegions ? `Preferred Regions: ${intake.preferredRegions}` : "",
    intake.allowedRegions ? `Allowed Regions: ${intake.allowedRegions}` : "",
    intake.restrictedRegions ? `Restricted Regions: ${intake.restrictedRegions}` : "",
    intake.riskConcerns ? `Risk Concerns: ${intake.riskConcerns}` : "",
  ].filter(Boolean);

  return {
    ...configured,
    name: intake.productCategory ? `${intake.productCategory} sourcing case` : configured.name,
    budget: {
      ...configured.budget,
      monthlyDemand: intake.monthlyDemand || configured.budget.monthlyDemand,
      budget: intake.budget || configured.budget.budget,
      maxAverageLeadTime: intake.maxLeadTime || configured.budget.maxAverageLeadTime,
    },
    forecastAssumptions: {
      ...configured.forecastAssumptions,
      seasonalityNotes: notes.join("\n") || configured.forecastAssumptions.seasonalityNotes,
    },
  };
};

export const deriveIntakeGuidance = (intake: IntakeState) => {
  const checklist = [
    "Add at least one demand hub for each customer region.",
    "Add supplier records with cost, lead time, reliability, capacity, ESG, and risk fields.",
    "Create active supplier-to-demand routes with allocation, freight cost, and transit time.",
    intake.riskConcerns ? `Model risk concerns: ${intake.riskConcerns}.` : "Add risk events or regional risk profiles if disruption exposure matters.",
    intake.budget ? "Compare recommendation against the budget constraint." : "Enter a budget if approval depends on spend.",
  ];
  const nextSteps = [
    intake.productCategory ? "Use the Data Input tab to add suppliers for this product category." : "Define the product category before adding suppliers.",
    intake.monthlyDemand ? "Create demand hubs and allocate that demand across routes." : "Enter monthly demand so the model can calculate capacity and cost.",
    "Generate the recommendation after suppliers, demand hubs, and routes are complete.",
  ];
  const assumptions = [
    `Strategy: ${getStrategyConfig(priorityToStrategy(intake.priority)).label}`,
    intake.maxLeadTime ? `Max Lead Time Target: ${intake.maxLeadTime} days` : "Max Lead Time Target Not Set",
    intake.sourcingMotion ? `Motion: ${toTitleLabel(intake.sourcingMotion)}` : "Motion Not Set",
  ];
  return { checklist, nextSteps, assumptions };
};

export const buildDataQuality = (scenario: Scenario, prediction: PredictionResult): DataQualityScore => {
  const activeRoutes = scenario.routes.filter((route) => route.active);
  const checks: DataQualityCheck[] = [
    { key: "product-details", label: "Missing Product Details", complete: Boolean(scenario.productDetails.name || scenario.productDetails.category || scenario.suppliers.some((supplier) => supplier.productCategory)), fix: "Add product name, category, specification, or import descriptors." },
    { key: "suppliers", label: "Missing Suppliers", complete: scenario.suppliers.length > 0, fix: "Add at least one supplier." },
    { key: "demand", label: "Missing Demand Hubs", complete: scenario.demandHubs.length > 0, fix: "Add customer, plant, warehouse, or regional demand hubs." },
    { key: "routes", label: "Missing Active Routes", complete: activeRoutes.length > 0, fix: "Create at least one active supplier-to-demand route." },
    { key: "unit-cost", label: "Missing Unit Costs", complete: scenario.suppliers.length > 0 && scenario.suppliers.every((supplier) => supplier.baseUnitCost > 0), fix: "Enter base unit cost for every active supplier." },
    { key: "lead-time", label: "Missing Lead Times", complete: scenario.suppliers.length > 0 && scenario.suppliers.every((supplier) => supplier.leadTime > 0) && activeRoutes.every((route) => route.transitTime > 0), fix: "Enter supplier lead time and route transit time." },
    { key: "freight", label: "Missing Freight Costs", complete: activeRoutes.length > 0 && activeRoutes.every((route) => route.freightCost > 0), fix: "Enter freight cost for each active route." },
    { key: "capacity", label: "Missing Capacity", complete: scenario.suppliers.length > 0 && scenario.suppliers.every((supplier) => supplier.capacity > 0), fix: "Enter monthly capacity for each supplier." },
    { key: "demand-volume", label: "Missing Demand Volume", complete: prediction.totalDemand > 0, fix: "Enter monthly demand in demand hubs or budget constraints." },
    { key: "risk", label: "Missing Risk Assumptions", complete: scenario.riskEvents.length > 0 || scenario.regionalRiskProfiles.length > 0 || scenario.suppliers.some((supplier) => supplier.politicalRisk || supplier.currencyRisk || supplier.naturalDisasterRisk), fix: "Add risk events, country risk profiles, or supplier risk scores." },
    { key: "budget", label: "Missing Budget Constraints", complete: scenario.budget.budget > 0 || scenario.budget.maxAverageLeadTime > 0 || scenario.budget.minServiceLevel > 0 || scenario.budget.maxSupplierAllocation > 0, fix: "Add budget, lead-time, service-level, or allocation constraints." },
  ];
  const completed = checks.filter((check) => check.complete).length;
  const score = Math.round((completed / checks.length) * 100);
  const band = score >= 80 ? "high" : score >= 50 ? "medium" : "low";
  const missing = checks.filter((check) => !check.complete);
  const nextBestAction = missing[0]?.fix ?? "Generate or export the sourcing decision report.";
  return {
    score,
    band,
    reliable: score >= 75 && prediction.confidenceScore >= 70,
    explanation:
      band === "high"
        ? "Confidence is high because core supplier, demand, route, cost, and constraint inputs are mostly complete."
        : band === "medium"
          ? "Confidence is medium because the network exists but some cost, risk, capacity, or constraint fields are still incomplete."
          : "Confidence is low because the app is missing core sourcing inputs needed for a reliable prediction.",
    nextBestAction,
    missingFields: missing.map((check) => check.label),
    recommendedFixes: missing.map((check) => check.fix),
    checks,
  };
};

const stageStatus = (complete: boolean, warning = false): WorkflowStage["status"] => (complete ? (warning ? "warning" : "complete") : "incomplete");

export const buildWorkflowStages = (scenario: Scenario, prediction: PredictionResult, intake: IntakeState): WorkflowStage[] => {
  const quality = buildDataQuality(scenario, prediction);
  const activeRoutes = scenario.routes.filter((route) => route.active);
  const hasCost = scenario.suppliers.some((supplier) => supplier.baseUnitCost > 0) && activeRoutes.some((route) => route.freightCost > 0);
  const hasRisk = scenario.riskEvents.length > 0 || scenario.regionalRiskProfiles.length > 0;
  const hasBudget = scenario.budget.budget > 0 || scenario.budget.maxAverageLeadTime > 0 || scenario.budget.minServiceLevel > 0;
  const hasComparison = prediction.confidenceScore >= 60 && activeRoutes.length > 0;
  const hasProductDetails = Boolean(intake.productCategory || scenario.productDetails.name || scenario.productDetails.category || scenario.productDetails.specification || scenario.suppliers.some((supplier) => supplier.productCategory));

  return [
    { id: "business-need", title: "Define Business Need", status: stageStatus(Boolean(intake.productCategory || scenario.budget.monthlyDemand || scenario.name !== "Blank Sourcing Network")), requiredInputs: ["Product Category", "Monthly Demand", "Business Priority"], missingInputs: [!intake.productCategory && !scenario.productDetails.category ? "Product Category" : "", !prediction.totalDemand ? "Monthly Demand" : ""].filter(Boolean), whyItMatters: "The model needs to know what decision it is supporting before cost, risk, and service tradeoffs can be interpreted.", nextBestAction: intake.productCategory ? "Add demand hubs for the business need." : "Complete the sourcing intake wizard.", actionLabel: "Open Intake Wizard", action: "intake" },
    { id: "product-spec", title: "Define Product Specification", status: stageStatus(hasProductDetails), requiredInputs: ["Product Category", "Specification Notes", "Supplier Category"], missingInputs: hasProductDetails ? [] : ["Product Specification"], whyItMatters: "Supplier comparisons are only meaningful when they are tied to the same product and specification.", nextBestAction: "Capture product details or supplier product categories.", actionLabel: "Open Product Details", action: "product" },
    { id: "demand", title: "Add Demand Hubs and Customers", status: stageStatus(scenario.demandHubs.length > 0 && prediction.totalDemand > 0, scenario.demandHubs.some((hub) => !(hub.monthlyDemand || hub.forecastDemand))), requiredInputs: ["Demand Hub Names", "Countries or Regions", "Monthly Demand"], missingInputs: scenario.demandHubs.length ? scenario.demandHubs.filter((hub) => !(hub.monthlyDemand || hub.forecastDemand)).map((hub) => `${hub.name || "Demand Hub"} Demand Volume`) : ["Demand Hubs"], whyItMatters: "Demand hubs tell the model where volume must be served and how route allocations should be evaluated.", nextBestAction: "Add a demand hub with monthly demand.", actionLabel: "Add Demand Hub", action: "demand" },
    { id: "suppliers", title: "Add Suppliers", status: stageStatus(scenario.suppliers.length > 0, scenario.suppliers.some((supplier) => !supplier.productCategory)), requiredInputs: ["Supplier Name", "Country or Region", "Product Category"], missingInputs: scenario.suppliers.length ? scenario.suppliers.filter((supplier) => !supplier.productCategory).map((supplier) => `${supplier.name || "Supplier"} Product Category`) : ["Suppliers"], whyItMatters: "Suppliers are the options being compared for landed cost, lead time, risk, ESG, and capacity.", nextBestAction: "Add at least one supplier.", actionLabel: "Add Supplier", action: "supplier" },
    { id: "routes", title: "Create Supplier-to-Demand Routes", status: stageStatus(activeRoutes.length > 0, activeRoutes.some((route) => route.allocationPct <= 0)), requiredInputs: ["Supplier", "Demand Hub", "Transport Mode", "Allocation"], missingInputs: activeRoutes.length ? activeRoutes.filter((route) => route.allocationPct <= 0).map((route) => `${route.originLabel || "Route"} Allocation`) : ["Active Routes"], whyItMatters: "Routes connect supply to demand and let the model calculate lane cost, lead time, emissions, and disruption exposure.", nextBestAction: "Create a route between a supplier and demand hub.", actionLabel: "Create Route", action: "route" },
    { id: "costs", title: "Add Cost Assumptions", status: stageStatus(hasCost, scenario.suppliers.some((supplier) => supplier.baseUnitCost <= 0) || activeRoutes.some((route) => route.freightCost <= 0)), requiredInputs: ["Supplier Unit Cost", "Freight Cost", "Tariffs or Insurance If Known"], missingInputs: quality.checks.filter((check) => ["unit-cost", "freight"].includes(check.key) && !check.complete).map((check) => check.label), whyItMatters: "Cost assumptions turn the supplier network into a landed-cost prediction.", nextBestAction: "Add supplier unit costs and route freight costs.", actionLabel: "Open Data Input", action: "data" },
    { id: "constraints", title: "Add Budget and Capacity Constraints", status: stageStatus(hasBudget && scenario.suppliers.every((supplier) => supplier.capacity > 0), !hasBudget), requiredInputs: ["Supplier Capacity", "Budget or Guardrails", "Service Target If Known"], missingInputs: quality.checks.filter((check) => ["capacity", "budget"].includes(check.key) && !check.complete).map((check) => check.label), whyItMatters: "Constraints determine whether a recommendation is feasible enough to approve.", nextBestAction: "Enter budget, capacity, lead-time, service, or allocation guardrails.", actionLabel: "Open Data Input", action: "data" },
    { id: "risk", title: "Add Risk Events and Regional Risk Profiles", status: stageStatus(hasRisk), requiredInputs: ["Risk Events", "Regional Risk Profiles", "Supplier Risk Scores"], missingInputs: hasRisk ? [] : ["Risk Assumptions"], whyItMatters: "Risk inputs reveal fragile regions, lanes, suppliers, and mitigation needs.", nextBestAction: "Add risk events or regional risk profiles.", actionLabel: "Add Risk", action: "risk" },
    { id: "levers", title: "Apply Negotiation Levers", status: stageStatus(scenario.levers.length > 0, scenario.levers.length > 0 && !scenario.levers.some((lever) => lever.active)), requiredInputs: ["Commercial or Operational Lever", "Expected Impact", "Active Toggle"], missingInputs: scenario.levers.length ? [] : ["Negotiation Levers"], whyItMatters: "Levers show how sourcing actions can improve cost, service, risk, and resilience.", nextBestAction: "Add a negotiation lever such as price concession, buffer stock, or contract flexibility.", actionLabel: "Add Lever", action: "lever" },
    { id: "scenarios", title: "Compare Scenarios", status: stageStatus(hasComparison), requiredInputs: ["Complete Network", "Selected Strategy", "Forecast Assumptions"], missingInputs: hasComparison ? [] : ["Complete Supplier-Demand-Route Network"], whyItMatters: "Scenario comparison shows the cost, risk, lead-time, ESG, and resilience tradeoffs before approval.", nextBestAction: "Review Forecast & Scenarios after core data is complete.", actionLabel: "Compare Scenarios", action: "forecast" },
    { id: "recommendation", title: "Generate Recommendation", status: stageStatus(prediction.confidenceScore >= 60 && activeRoutes.length > 0), requiredInputs: ["Prediction Confidence", "Strategy", "Tradeoff Explanation"], missingInputs: prediction.confidenceScore >= 60 ? [] : prediction.missingDataFields.slice(0, 4), whyItMatters: "A recommendation turns the analysis into an approve, revise, or reject decision.", nextBestAction: "Generate recommendation after data quality improves.", actionLabel: "Open Recommendations", action: "recommendations" },
    { id: "report", title: "Export Sourcing Decision Report", status: stageStatus(quality.reliable), requiredInputs: ["Recommendation", "Risk Summary", "Missing Assumptions", "Decision Memo"], missingInputs: quality.reliable ? [] : ["Reliable Data Quality Score"], whyItMatters: "Reports convert the model output into sourcing deliverables for stakeholders, RFQs, and approval.", nextBestAction: "Generate a decision memo or executive summary.", actionLabel: "Open Reports", action: "reports" },
  ];
};

export const buildStrategyWarnings = (scenario: Scenario, prediction: PredictionResult, strategy: SourcingStrategy) => {
  const warnings: string[] = [];
  const supplierAllocations = prediction.suppliers.filter((supplier) => supplier.allocationPct > 0);
  if (strategy === "dual-sourcing" && supplierAllocations.length < 2) warnings.push("Dual sourcing needs at least two active allocated suppliers.");
  if (strategy === "dual-sourcing" && supplierAllocations.some((supplier) => supplier.allocationPct > 60)) warnings.push("Dual sourcing warning: one supplier carries more than 60% allocation.");
  if (strategy === "risk-first" && prediction.weightedRisk > 50) warnings.push("Risk-first warning: weighted network risk is still elevated.");
  if (strategy === "emergency" && prediction.avgLeadTime > Math.max(1, scenario.budget.maxAverageLeadTime || 14)) warnings.push("Emergency sourcing warning: lead time may be too slow for the selected posture.");
  if (strategy === "esg-first" && prediction.esgAverage > 0 && prediction.esgAverage < 70) warnings.push("ESG-first warning: weighted ESG score is below a strong approval threshold.");
  if (strategy === "lowest-cost" && prediction.shortageRisk > 35) warnings.push("Lowest-cost warning: savings may be exposing service or capacity risk.");
  return warnings;
};

export const buildRecommendationExplanation = (scenario: Scenario, prediction: PredictionResult, recommendation: Recommendation, strategy: SourcingStrategy): RecommendationExplanation => {
  const config = getStrategyConfig(strategy);
  const supplierMixByDemandHub = scenario.demandHubs.map((hub) => {
    const routes = scenario.routes.filter((route) => route.active && route.demandHubId === hub.id);
    if (!routes.length) return `${hub.name || "Demand hub"}: no active supplier route`;
    return `${hub.name || "Demand hub"}: ${routes
      .map((route) => `${route.allocationPct || 0}% ${scenario.suppliers.find((supplier) => supplier.id === route.supplierId)?.name || "supplier"} via ${route.mode}`)
      .join("; ")}`;
  });
  return {
    supplierMixByDemandHub: supplierMixByDemandHub.length ? supplierMixByDemandHub : ["No demand hub mix yet. Add demand hubs and routes."],
    whySelected: `The recommendation follows ${config.label.toLowerCase()}, using weights that emphasize ${config.description.toLowerCase()}`,
    biggestTradeoff:
      strategy === "lowest-cost"
        ? "The main tradeoff is that cost savings can reduce resilience if allocation concentrates in one supplier or region."
        : strategy === "emergency"
          ? "The main tradeoff is paying more or accepting lower ESG performance to protect speed and reliability."
          : "The main tradeoff is balancing premium cost against lower risk, better service, or stronger resilience.",
    costReasoning: prediction.totalScenarioCost > 0 ? `Projected total landed cost is $${prediction.totalScenarioCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}; average landed cost is $${prediction.avgLandedCost.toFixed(2)} per unit.` : "Cost reasoning is pending supplier unit cost, demand volume, route freight, and allocation data.",
    leadTimeReasoning: prediction.avgLeadTime > 0 ? `Average lead time is ${prediction.avgLeadTime.toFixed(1)} days across active suppliers and routes.` : "Lead-time reasoning is pending supplier lead time and route transit time.",
    riskReasoning: prediction.weightedRisk > 0 ? `Weighted risk is ${prediction.weightedRisk.toFixed(1)}; biggest risk currently flagged is ${recommendation.biggestRisk || "not identified"}.` : "Risk reasoning is pending risk events, route risk, supplier risk, or regional risk profiles.",
    serviceReasoning: prediction.serviceLevel > 0 ? `Predicted service level is ${prediction.serviceLevel.toFixed(1)}%, influenced by reliability, safety stock, route delay, and supplier diversification.` : "Service reasoning is pending reliability, demand, route, and inventory inputs.",
    esgReasoning: prediction.esgAverage > 0 ? `Weighted ESG score is ${prediction.esgAverage.toFixed(0)}, adjusted by supplier ESG and route emissions factors.` : "ESG reasoning is pending supplier ESG scores and route emissions factors.",
    resilienceReasoning: prediction.resilienceScore > 0 ? `Resilience score is ${prediction.resilienceScore.toFixed(0)}, based on supplier count, region diversity, mode diversity, capacity headroom, reliability, risk, and levers.` : "Resilience reasoning is pending multiple suppliers, routes, capacity, reliability, and risk data.",
  };
};

export const answerCopilotQuestion = (question: string, scenario: Scenario, prediction: PredictionResult, recommendation: Recommendation, quality: DataQualityScore, strategy: SourcingStrategy) => {
  const normalized = question.toLowerCase();
  const riskiestSupplier = [...prediction.suppliers].sort((a, b) => b.riskScore - a.riskScore)[0];
  const riskiestRoute = [...scenario.routes]
    .filter((route) => route.active)
    .sort((a, b) => b.delayProbability + b.customsRisk + b.portCongestionRisk - (a.delayProbability + a.customsRisk + a.portCongestionRisk))[0];
  const bestCostSupplier = [...prediction.suppliers].filter((supplier) => supplier.landedCost > 0).sort((a, b) => a.landedCost - b.landedCost)[0];

  if (normalized.includes("next")) return quality.nextBestAction;
  if (normalized.includes("missing")) return quality.missingFields.length ? `Missing data: ${quality.missingFields.join(", ")}. Recommended fix: ${quality.recommendedFixes[0]}.` : "No critical missing data detected. Generate a recommendation or export a report.";
  if (normalized.includes("supplier") && normalized.includes("risky")) return riskiestSupplier ? `${riskiestSupplier.supplierName || "The riskiest supplier"} is risky because its risk score is ${riskiestSupplier.riskScore.toFixed(1)}, with active risks: ${riskiestSupplier.activeRiskNames.join(", ") || "none recorded"}.` : "Add suppliers before supplier risk can be explained.";
  if (normalized.includes("route")) return riskiestRoute ? `${riskiestRoute.originLabel || "Origin"} to ${riskiestRoute.destinationLabel || "destination"} appears riskiest because delay, customs, and congestion scores total ${(riskiestRoute.delayProbability + riskiestRoute.customsRisk + riskiestRoute.portCongestionRisk).toFixed(0)}.` : "Create active routes before route risk can be diagnosed.";
  if (normalized.includes("landed cost") || normalized.includes("lower")) return bestCostSupplier ? `Start with ${bestCostSupplier.supplierName || bestCostSupplier.country}: it has the lowest visible landed cost at $${bestCostSupplier.landedCost.toFixed(2)} per unit. Also check freight costs, tariffs, and price-concession levers.` : "Add supplier unit costs and route freight costs before landed cost can be reduced.";
  if (normalized.includes("service")) return "Improve service level by raising supplier reliability, reducing average lead time, adding safety stock, splitting allocation, and reducing active route delay risk.";
  if (normalized.includes("resilience")) return "Improve resilience by qualifying a second supplier, reducing regional concentration, adding alternate logistics lanes, reserving capacity, and using contract flexibility.";
  if (normalized.includes("negotiate")) return recommendation.bestLever ? `Negotiate around: ${recommendation.bestLever}. Pair it with the supplier or lane contributing the largest cost, delay, or risk exposure.` : "Add negotiation levers and supplier cost data before negotiation targeting.";
  if (normalized.includes("weakness")) return quality.missingFields[0] ? `The biggest weakness is ${quality.missingFields[0]}; without it, confidence stays ${quality.band}.` : recommendation.biggestRisk || "No major weakness detected from current data.";
  if (normalized.includes("summary") || normalized.includes("recommendation")) return `${recommendation.finalDecision.toUpperCase()}: ${recommendation.text} Strategy: ${getStrategyConfig(strategy).label}. Confidence: ${quality.score}%.`;
  return "Ask about next steps, missing data, supplier risk, route risk, landed cost, service level, resilience, negotiation, plan weakness, or a recommendation summary.";
};

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

export const buildStrategyComparisonRows = (scenario: Scenario, strategy: SourcingStrategy): ScenarioComparisonRow[] => {
  const selected = applyStrategyToScenario(scenario, strategy);
  const selectedPlan = applyAllocation(selected, buildRecommendedAllocation(selected, selected.optimizationGoal));
  const costPlan = applyAllocation(applyStrategyToScenario(scenario, "lowest-cost"), buildRecommendedAllocation(scenario, "Lowest cost"));
  const riskPlan = applyAllocation(applyStrategyToScenario(scenario, "risk-first"), buildRecommendedAllocation(scenario, "Lowest risk"));
  const speedPlan = applyAllocation(applyStrategyToScenario(scenario, "fastest-delivery"), buildRecommendedAllocation(scenario, "Fastest lead time"));
  return [
    rowFromScenario("Current plan", scenario),
    rowFromScenario(`${getStrategyConfig(strategy).label} plan`, selectedPlan),
    rowFromScenario("Lowest cost plan", costPlan),
    rowFromScenario("Lowest risk plan", riskPlan),
    rowFromScenario("Fastest delivery plan", speedPlan),
  ];
};

export const generateReportText = (type: ReportType, scenario: Scenario, prediction: PredictionResult, recommendation: Recommendation, quality: DataQualityScore, strategy: SourcingStrategy) => {
  const explanation = buildRecommendationExplanation(scenario, prediction, recommendation, strategy);
  const title = reportTypes.find((report) => report.id === type)?.label ?? "Sourcing Report";
  const supplierComparison = scenario.suppliers.length
    ? scenario.suppliers
        .map((supplier) => {
          const result = prediction.suppliers.find((item) => item.supplierId === supplier.id);
          return `- ${supplier.name || "Unnamed supplier"} (${supplier.country || "country missing"}): cost ${supplier.baseUnitCost || "missing"}, capacity ${supplier.capacity || "missing"}, lead time ${supplier.leadTime || "missing"} days, risk ${result?.riskScore.toFixed(1) ?? "pending"}.`;
        })
        .join("\n")
    : "- No suppliers entered.";
  const riskSummary = scenario.riskEvents.length
    ? scenario.riskEvents.map((risk) => `- ${risk.name || "Unnamed risk"}: ${risk.probability} probability, severity ${risk.severity || "missing"}, ${risk.active ? "active" : "inactive"}.`).join("\n")
    : "- No risk events entered.";
  const playbookText = riskMitigationPlaybook
    .slice(0, type === "risk-mitigation" ? riskMitigationPlaybook.length : 4)
    .map((item) => `- ${item.category}: ${item.mitigations.join("; ")}`)
    .join("\n");
  const rfqSection =
    type === "rfq-template"
      ? "\nRFQ fields:\n- Supplier legal name\n- Manufacturing location\n- Unit price by volume tier\n- MOQ and capacity reservation\n- Standard lead time and expedite lead time\n- Incoterms and freight assumptions\n- Quality certifications\n- ESG disclosures\n- Risk continuity plan\n"
      : "";
  const negotiationSection =
    type === "negotiation-plan"
      ? `\nNegotiation plan:\n- Primary ask: ${recommendation.bestLever}\n- Secondary asks: capacity reservation, freight transparency, service-level commitment, and disruption recovery clause.\n- Evidence: tie ask to cost, lead time, risk, service, and resilience metrics.\n`
      : "";

  return `${title}

Objective
${scenario.name}: support a ${getStrategyConfig(strategy).label.toLowerCase()} decision using the current sourcing data.

Input Data Summary
- Product: ${scenario.productDetails.name || "pending"}
- Product Category: ${scenario.productDetails.category === "Other" ? scenario.productDetails.customCategory || "Other" : scenario.productDetails.category || "pending"}
- Suppliers: ${scenario.suppliers.length}
- Demand Hubs: ${scenario.demandHubs.length}
- Active Routes: ${scenario.routes.filter((route) => route.active).length}
- Active Risks: ${scenario.riskEvents.filter((risk) => risk.active).length}
- Data Quality: ${quality.score}% (${quality.band})

Supplier Comparison
${supplierComparison}

Risk Summary
${riskSummary}

Cost Summary
- Total Landed Cost: ${prediction.totalScenarioCost ? `$${prediction.totalScenarioCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "pending"}
- Average Landed Cost: ${prediction.avgLandedCost ? `$${prediction.avgLandedCost.toFixed(2)}` : "pending"}
- Risk-Adjusted Cost: ${prediction.riskAdjustedCost ? `$${prediction.riskAdjustedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "pending"}

Recommendation
${recommendation.text}

Supplier Mix by Demand Hub
${explanation.supplierMixByDemandHub.map((item) => `- ${item}`).join("\n")}

Tradeoffs
${explanation.biggestTradeoff}

Risk Mitigation Playbook
${playbookText}
${rfqSection}${negotiationSection}
Missing Data and Assumptions
${quality.missingFields.length ? quality.missingFields.map((field) => `- ${field}`).join("\n") : "- No critical missing fields detected."}

Final Decision
${recommendation.finalDecision.toUpperCase()}`;
};

export const generateReportCsv = (type: ReportType, scenario: Scenario, prediction: PredictionResult) => {
  if (["supplier-comparison", "supplier-scorecard", "landed-cost"].includes(type)) {
    const rows = [["Supplier", "Country", "Base Unit Cost", "Capacity", "Lead Time", "Reliability", "Risk Score", "ESG Score"]];
    scenario.suppliers.forEach((supplier) => {
      const result = prediction.suppliers.find((item) => item.supplierId === supplier.id);
      rows.push([supplier.name, supplier.country, String(supplier.baseUnitCost), String(supplier.capacity), String(supplier.leadTime), String(supplier.reliability), result?.riskScore.toFixed(1) ?? "", String(supplier.esgScore)]);
    });
    return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  }
  const rows = [["Metric", "Value"], ["Suppliers", scenario.suppliers.length], ["Demand Hubs", scenario.demandHubs.length], ["Active Routes", scenario.routes.filter((route) => route.active).length], ["Total Cost", prediction.totalScenarioCost], ["Average Lead Time", prediction.avgLeadTime], ["Weighted Risk", prediction.weightedRisk]];
  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
};
