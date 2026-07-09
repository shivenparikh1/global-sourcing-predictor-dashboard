import { countryOptions, getRegionForCountry, productCategoryOptions, regionOptions } from "./referenceData";
import type { DemandHub, ForecastAssumptions, LogisticsHub, NegotiationLever, ProductDetails, RegionalRiskProfile, RiskEvent, Route, Scenario, Supplier, TransportMode } from "./types";

const toLower = (text: string) => text.toLowerCase();

const matchNumber = (text: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return Number(match[1].replace(/,/g, ""));
  }
  return undefined;
};

const matchText = (text: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/[.;]+$/, "");
  }
  return undefined;
};

const pickOption = (text: string, options: string[]) => {
  const lower = toLower(text);
  return options.find((option) => lower.includes(option.toLowerCase()));
};

const pickCountry = (text: string) => pickOption(text, countryOptions);
const pickRegion = (text: string) => pickOption(text, regionOptions);
const pickCategory = (text: string) => pickOption(text, productCategoryOptions);

const pickMode = (text: string): TransportMode | undefined => {
  const lower = toLower(text);
  const explicitMode = lower.match(/(?:transport mode|mode|ship(?:ping)? by|move(?:d)? by|by)\s*(air|sea|ocean|land|truck|road|rail|multimodal|multi-modal|multi modal)\b/);
  if (explicitMode?.[1]) {
    const value = explicitMode[1];
    if (value === "air") return "Air";
    if (value === "sea" || value === "ocean") return "Sea";
    if (value === "multimodal" || value === "multi-modal" || value === "multi modal") return "Multimodal";
    return "Land";
  }
  if (/\bair\b|air freight/.test(lower)) return "Air";
  if (/\bsea\b|ocean|vessel|port/.test(lower)) return "Sea";
  if (/\bland\b|truck|road|rail/.test(lower)) return "Land";
  if (/multi.?modal/.test(lower)) return "Multimodal";
  return undefined;
};

const pickProbability = (text: string): RiskEvent["probability"] | undefined => {
  const lower = toLower(text);
  if (/high probability|probability high|likely/.test(lower)) return "High";
  if (/low probability|probability low|unlikely/.test(lower)) return "Low";
  if (/medium probability|probability medium|moderate/.test(lower)) return "Medium";
  return undefined;
};

const pickPriority = (text: string): DemandHub["priorityLevel"] | undefined => {
  const lower = toLower(text);
  if (/critical/.test(lower)) return "Critical";
  if (/\bhigh\b/.test(lower)) return "High";
  if (/\blow\b/.test(lower)) return "Low";
  if (/medium|moderate/.test(lower)) return "Medium";
  return undefined;
};

const pickDuration = (days: number | undefined): RiskEvent["durationDays"] | undefined => {
  if (typeof days !== "number" || !Number.isFinite(days)) return undefined;
  const durations: RiskEvent["durationDays"][] = [30, 60, 90, 180];
  return durations.reduce((closest, duration) => (Math.abs(duration - days) < Math.abs(closest - days) ? duration : closest), durations[0]);
};

const applyNumber = <T, K extends keyof T>(draft: T, key: K, value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? { ...draft, [key]: value } : draft;

const applyString = <T, K extends keyof T>(draft: T, key: K, value: string | undefined) =>
  value ? { ...draft, [key]: value } : draft;

export const autofillSupplierFromText = (draft: Supplier, text: string): Supplier => {
  let next = { ...draft };
  const country = pickCountry(text);
  const region = pickRegion(text) || (country ? getRegionForCountry(country) : undefined);
  const category = pickCategory(text);
  const mode = pickMode(text);
  next = applyString(next, "name", matchText(text, [/supplier(?: name)?[:\-]\s*([^,\n.]+)/i, /vendor[:\-]\s*([^,\n.]+)/i, /factory[:\-]\s*([^,\n.]+)/i]));
  next = applyString(next, "country", country);
  next = applyString(next, "region", region);
  next = applyString(next, "productCategory", category);
  if (mode) next.transportMode = mode;
  next = applyNumber(next, "baseUnitCost", matchNumber(text, [/(?:unit cost|base cost|cost)[:\s$]*([\d,.]+)/i]));
  next = applyNumber(next, "tariffRate", matchNumber(text, [/(?:tariff|duty)[:\s]*([\d,.]+)\s*%?/i]));
  next = applyNumber(next, "freightCost", matchNumber(text, [/(?:freight)[:\s$]*([\d,.]+)/i]));
  next = applyNumber(next, "insuranceRate", matchNumber(text, [/(?:insurance)[:\s]*([\d,.]+)\s*%?/i]));
  next = applyNumber(next, "leadTime", matchNumber(text, [/(?:lead time|supplier lead time)[:\s]*([\d,.]+)\s*(?:days|d)?/i]));
  next = applyNumber(next, "reliability", matchNumber(text, [/(?:reliability|otif)[:\s]*([\d,.]+)\s*%?/i]));
  next = applyNumber(next, "capacity", matchNumber(text, [/(?:capacity)[:\s]*([\d,.]+)\s*(?:units|pcs)?/i]));
  next = applyNumber(next, "moq", matchNumber(text, [/(?:moq|minimum order quantity)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "esgScore", matchNumber(text, [/(?:esg)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "qualityScore", matchNumber(text, [/(?:quality score|quality)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "politicalRisk", matchNumber(text, [/(?:political risk|geopolitical risk)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "currencyRisk", matchNumber(text, [/(?:currency risk|fx risk)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "naturalDisasterRisk", matchNumber(text, [/(?:natural disaster risk|climate risk|weather risk)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "financialHealth", matchNumber(text, [/(?:financial health)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "allocation", matchNumber(text, [/(?:allocation|share)[:\s]*([\d,.]+)\s*%?/i]));
  return next;
};

export const autofillDemandHubFromText = (draft: DemandHub, text: string): DemandHub => {
  let next = { ...draft };
  const country = pickCountry(text);
  next = applyString(next, "name", matchText(text, [/(?:demand hub|hub|destination|warehouse|dc)[:\-]\s*([^,\n.]+)/i]));
  next = applyString(next, "country", country);
  next = applyString(next, "region", pickRegion(text) || (country ? getRegionForCountry(country) : undefined));
  const priority = pickPriority(text);
  if (priority) next.priorityLevel = priority;
  next = applyNumber(next, "monthlyDemand", matchNumber(text, [/(?:monthly demand|demand)[:\s]*([\d,.]+)\s*(?:units|pcs)?/i]));
  next = applyNumber(next, "forecastDemand", matchNumber(text, [/(?:forecast demand|forecast)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "serviceLevelTarget", matchNumber(text, [/(?:service target|service level|target service)[:\s]*([\d,.]+)\s*%?/i]));
  next = applyNumber(next, "maxLeadTime", matchNumber(text, [/(?:max lead time|maximum lead time)[:\s]*([\d,.]+)\s*(?:days|d)?/i]));
  next = applyNumber(next, "currentInventory", matchNumber(text, [/(?:current inventory|inventory)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "safetyStock", matchNumber(text, [/(?:safety stock|buffer)[:\s]*([\d,.]+)\s*(?:days)?/i]));
  next = applyString(next, "requiredDeliveryDate", matchText(text, [/(?:required delivery date|delivery date|target date)[:\s]*(\d{4}-\d{2}-\d{2})/i]));
  return next;
};

export const autofillLogisticsHubFromText = (draft: LogisticsHub, text: string): LogisticsHub => {
  let next = { ...draft };
  const country = pickCountry(text);
  next = applyString(next, "name", matchText(text, [/(?:port|airport|hub|terminal|dc)[:\-]\s*([^,\n.]+)/i]));
  next = applyString(next, "country", country);
  next = applyString(next, "region", pickRegion(text) || (country ? getRegionForCountry(country) : undefined));
  const lower = toLower(text);
  if (/airport/.test(lower)) next.type = "Airport";
  else if (/rail/.test(lower)) next.type = "Rail terminal";
  else if (/distribution center|\bdc\b/.test(lower)) next.type = "Distribution center";
  else if (/cross.?dock/.test(lower)) next.type = "Cross-dock";
  else if (/port/.test(lower)) next.type = "Port";
  next = applyNumber(next, "customsRisk", matchNumber(text, [/(?:customs risk)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "congestionRisk", matchNumber(text, [/(?:congestion risk|port congestion)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "handlingCost", matchNumber(text, [/(?:handling cost)[:\s$]*([\d,.]+)/i]));
  next = applyNumber(next, "dwellTimeDays", matchNumber(text, [/(?:dwell time|dwell)[:\s]*([\d,.]+)\s*(?:days|d)?/i]));
  return next;
};

export const autofillRouteFromText = (draft: Route, text: string, scenario: Scenario): Route => {
  let next = { ...draft };
  const lower = toLower(text);
  const supplier = scenario.suppliers.find((item) => item.name && lower.includes(item.name.toLowerCase())) || scenario.suppliers.find((item) => item.country && lower.includes(item.country.toLowerCase()));
  const hub = scenario.demandHubs.find((item) => item.name && lower.includes(item.name.toLowerCase())) || scenario.demandHubs.find((item) => item.country && lower.includes(item.country.toLowerCase()));
  const logisticsHub = scenario.logisticsHubs.find((item) => item.name && lower.includes(item.name.toLowerCase()));
  const mode = pickMode(text);
  if (supplier) next = { ...next, supplierId: supplier.id, originLabel: supplier.country || supplier.name, from: supplier.coordinates };
  if (hub) next = { ...next, demandHubId: hub.id, destinationLabel: hub.name || hub.country, to: hub.coordinates };
  if (logisticsHub) next = { ...next, logisticsHubId: logisticsHub.id, via: logisticsHub.coordinates };
  if (mode) next.mode = mode;
  next = applyNumber(next, "allocationPct", matchNumber(text, [/(?:allocation|share)[:\s]*([\d,.]+)\s*%?/i]));
  next = applyNumber(next, "freightCost", matchNumber(text, [/(?:freight cost|freight)[:\s$]*([\d,.]+)/i]));
  next = applyNumber(next, "transitTime", matchNumber(text, [/(?:transit time|transit|route lead time)[:\s]*([\d,.]+)\s*(?:days|d)?/i]));
  next = applyNumber(next, "delayProbability", matchNumber(text, [/(?:delay probability|delay risk|delay)[:\s]*([\d,.]+)\s*%?/i]));
  next = applyNumber(next, "customsRisk", matchNumber(text, [/(?:customs risk)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "portCongestionRisk", matchNumber(text, [/(?:congestion risk|port congestion)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "emissionsFactor", matchNumber(text, [/(?:emissions factor|emissions)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "distanceEstimate", matchNumber(text, [/(?:distance)[:\s]*([\d,.]+)\s*(?:km|kilometers)?/i]));
  return next;
};

export const autofillRiskFromText = (draft: RiskEvent, text: string, suppliers: Array<{ id: string; name: string; country: string }>, demandHubs: Array<{ id: string; name: string; country: string }>): RiskEvent => {
  let next = { ...draft };
  next = applyString(next, "name", matchText(text, [/(?:risk|event|issue)[:\-]\s*([^,\n.]+)/i]));
  const probability = pickProbability(text);
  if (probability) next.probability = probability;
  const durationDays = pickDuration(matchNumber(text, [/(?:duration)[:\s]*([\d,.]+)\s*(?:days|d)?/i]));
  if (durationDays) next.durationDays = durationDays;
  next = applyNumber(next, "costImpactPct", matchNumber(text, [/(?:cost impact|landed cost impact)[:\s]*([\d,.]+)\s*%?/i]));
  next = applyNumber(next, "freightImpactPct", matchNumber(text, [/(?:freight impact)[:\s]*([\d,.]+)\s*%?/i]));
  next = applyNumber(next, "leadTimeImpactDays", matchNumber(text, [/(?:lead.?time impact|lead time delay|delay)[:\s]*([\d,.]+)\s*(?:days|d)?/i]));
  next = applyNumber(next, "reliabilityImpactPct", matchNumber(text, [/(?:reliability impact)[:\s]*([\d,.]+)\s*%?/i]));
  next = applyNumber(next, "riskScoreImpact", matchNumber(text, [/(?:risk score impact|risk impact)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "severity", matchNumber(text, [/(?:severity)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "confidenceLevel", matchNumber(text, [/(?:confidence)[:\s]*([\d,.]+)\s*%?/i]));
  const countries = countryOptions.filter((country) => toLower(text).includes(country.toLowerCase()));
  if (countries.length) next.affectedCountries = Array.from(new Set([...next.affectedCountries, ...countries]));
  const modes = ["Sea", "Air", "Land", "Multimodal"].filter((mode) => toLower(text).includes(mode.toLowerCase())) as TransportMode[];
  if (modes.length) next.affectedModes = Array.from(new Set([...next.affectedModes, ...modes]));
  const supplierIds = suppliers.filter((supplier) => toLower(text).includes(supplier.name.toLowerCase()) || toLower(text).includes(supplier.country.toLowerCase())).map((supplier) => supplier.id);
  if (supplierIds.length) next.affectedSupplierIds = Array.from(new Set([...next.affectedSupplierIds, ...supplierIds]));
  const hubIds = demandHubs.filter((hub) => toLower(text).includes(hub.name.toLowerCase()) || toLower(text).includes(hub.country.toLowerCase())).map((hub) => hub.id);
  if (hubIds.length) next.affectedDemandHubIds = Array.from(new Set([...next.affectedDemandHubIds, ...hubIds]));
  if (!next.description) next.description = text.trim();
  return next;
};

export const autofillProductFromText = (draft: ProductDetails, text: string): ProductDetails => {
  let next = { ...draft };
  next = applyString(next, "name", matchText(text, [/(?:product|part|item)[:\-]\s*([^,\n.]+)/i]));
  next = applyString(next, "sku", matchText(text, [/(?:sku|part number|pn)[:\-]\s*([A-Za-z0-9._-]+)/i]));
  next = applyString(next, "category", pickCategory(text));
  next = applyString(next, "unitOfMeasure", matchText(text, [/(?:unit of measure|uom)[:\-]\s*([^,\n.]+)/i]));
  next = applyNumber(next, "annualVolume", matchNumber(text, [/(?:annual volume|volume)[:\s]*([\d,.]+)/i]));
  if (!next.specification) next.specification = matchText(text, [/(?:specification|spec)[:\-]\s*([^]+)/i]) ?? next.specification;
  if (!next.complianceRequirements) next.complianceRequirements = matchText(text, [/(?:compliance|certifications?)[:\-]\s*([^.\n]+)/i]) ?? next.complianceRequirements;
  if (!next.qualityRequirements) next.qualityRequirements = matchText(text, [/(?:quality requirements?|quality)[:\-]\s*([^.\n]+)/i]) ?? next.qualityRequirements;
  if (!next.descriptors) next.descriptors = text.trim();
  return next;
};

export const autofillLeverFromText = (draft: NegotiationLever, text: string): NegotiationLever => {
  let next = { ...draft };
  next = applyString(next, "name", matchText(text, [/(?:lever|action|negotiation)[:\-]\s*([^,\n.]+)/i]));
  next = applyString(next, "effect", matchText(text, [/(?:effect|summary)[:\-]\s*([^.\n]+)/i]));
  next = applyNumber(next, "unitCostImpactPct", matchNumber(text, [/(?:unit cost impact|price concession|unit cost)[:\s]*(-?[\d,.]+)\s*%?/i]));
  next = applyNumber(next, "freightCostImpactPct", matchNumber(text, [/(?:freight cost impact|freight impact)[:\s]*(-?[\d,.]+)\s*%?/i]));
  next = applyNumber(next, "leadTimeImpactPct", matchNumber(text, [/(?:lead.?time impact)[:\s]*(-?[\d,.]+)\s*%?/i]));
  next = applyNumber(next, "reliabilityImpactPct", matchNumber(text, [/(?:reliability impact)[:\s]*(-?[\d,.]+)/i]));
  next = applyNumber(next, "resilienceImpact", matchNumber(text, [/(?:resilience impact)[:\s]*(-?[\d,.]+)/i]));
  next = applyNumber(next, "serviceLevelImpact", matchNumber(text, [/(?:service.?level impact|service impact)[:\s]*(-?[\d,.]+)/i]));
  next = applyNumber(next, "emissionsImpactPct", matchNumber(text, [/(?:emissions impact)[:\s]*(-?[\d,.]+)\s*%?/i]));
  next = applyNumber(next, "managementCostImpactPct", matchNumber(text, [/(?:management cost impact)[:\s]*(-?[\d,.]+)\s*%?/i]));
  return next;
};

export const autofillRegionalRiskFromText = (draft: RegionalRiskProfile, text: string): RegionalRiskProfile => {
  let next = { ...draft };
  const country = pickCountry(text);
  next = applyString(next, "country", country);
  next = applyString(next, "region", pickRegion(text) || (country ? getRegionForCountry(country) : undefined));
  next = applyNumber(next, "politicalRisk", matchNumber(text, [/(?:political risk|geopolitical risk)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "currencyRisk", matchNumber(text, [/(?:currency risk|fx risk)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "naturalDisasterRisk", matchNumber(text, [/(?:natural disaster risk|weather risk|climate risk)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "regulatoryRisk", matchNumber(text, [/(?:regulatory risk)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "laborRisk", matchNumber(text, [/(?:labor risk)[:\s]*([\d,.]+)/i]));
  next = applyNumber(next, "infrastructureRisk", matchNumber(text, [/(?:infrastructure risk)[:\s]*([\d,.]+)/i]));
  if (!next.notes) next.notes = matchText(text, [/(?:notes?|source)[:\-]\s*([^]+)/i]) ?? next.notes;
  return next;
};

export const autofillForecastFromText = (draft: ForecastAssumptions, text: string): ForecastAssumptions => {
  let next = { ...draft };
  next = applyNumber(next, "demandGrowthPct", matchNumber(text, [/(?:demand growth)[:\s]*(-?[\d,.]+)\s*%?/i]));
  next = applyNumber(next, "costInflationPct", matchNumber(text, [/(?:cost inflation|inflation)[:\s]*(-?[\d,.]+)\s*%?/i]));
  next = applyNumber(next, "riskTrendPct", matchNumber(text, [/(?:risk trend|risk drift)[:\s]*(-?[\d,.]+)/i]));
  next = applyNumber(next, "serviceDriftPct", matchNumber(text, [/(?:service drift|service trend)[:\s]*(-?[\d,.]+)/i]));
  if (!next.seasonalityNotes) next.seasonalityNotes = text.trim();
  return next;
};
