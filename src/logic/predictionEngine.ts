import type { ForecastPoint, PredictionResult, Scenario, Supplier, SupplierPrediction, TransportMode } from "./types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const weightedAverage = (items: SupplierPrediction[], key: keyof SupplierPrediction) => {
  const totalUnits = items.reduce((sum, item) => sum + item.allocationUnits, 0);
  if (!totalUnits) return 0;
  return items.reduce((sum, item) => sum + Number(item[key]) * item.allocationUnits, 0) / totalUnits;
};

const activeLeverEffects = (scenario: Scenario) =>
  scenario.levers
    .filter((lever) => lever.active)
    .reduce(
      (effects, lever) => ({
        unitCostImpactPct: effects.unitCostImpactPct + (lever.unitCostImpactPct || 0),
        freightCostImpactPct: effects.freightCostImpactPct + (lever.freightCostImpactPct || 0),
        leadTimeImpactPct: effects.leadTimeImpactPct + (lever.leadTimeImpactPct || 0),
        reliabilityImpactPct: effects.reliabilityImpactPct + (lever.reliabilityImpactPct || 0),
        resilienceImpact: effects.resilienceImpact + (lever.resilienceImpact || 0),
        serviceLevelImpact: effects.serviceLevelImpact + (lever.serviceLevelImpact || 0),
        emissionsImpactPct: effects.emissionsImpactPct + (lever.emissionsImpactPct || 0),
        managementCostImpactPct: effects.managementCostImpactPct + (lever.managementCostImpactPct || 0),
      }),
      {
        unitCostImpactPct: 0,
        freightCostImpactPct: 0,
        leadTimeImpactPct: 0,
        reliabilityImpactPct: 0,
        resilienceImpact: 0,
        serviceLevelImpact: 0,
        emissionsImpactPct: 0,
        managementCostImpactPct: 0,
      },
    );

export const getTotalDemand = (scenario: Scenario) =>
  scenario.demandHubs.reduce((sum, hub) => sum + Math.max(0, hub.monthlyDemand || hub.forecastDemand || 0), 0) || Math.max(0, scenario.budget.monthlyDemand || 0);

export const getRiskTag = (riskScore: number) => {
  if (riskScore >= 64) return "High Risk";
  if (riskScore >= 42) return "Balanced";
  return "Low Risk";
};

export const getSupplierRiskEvents = (scenario: Scenario, supplier: Supplier, mode: TransportMode) =>
  scenario.riskEvents.filter((event) => {
    if (!event.active) return false;
    const routes = scenario.routes.filter((route) => route.active && route.supplierId === supplier.id);
    const affectsDemand = !event.affectedDemandHubIds?.length || routes.some((route) => event.affectedDemandHubIds.includes(route.demandHubId));
    const affectsSupplier = event.affectedSupplierIds.includes(supplier.id) || event.affectedCountries.includes(supplier.country);
    const affectsMode = event.affectedModes.length === 0 || event.affectedModes.includes(mode);
    return affectsSupplier && affectsMode && affectsDemand;
  });

export const predictSupplier = (scenario: Scenario, supplier: Supplier): SupplierPrediction => {
  const routes = scenario.routes.filter((route) => route.active && route.supplierId === supplier.id);
  const totalDemand = getTotalDemand(scenario);
  const routedUnits = routes.reduce((sum, route) => {
    const demandHub = scenario.demandHubs.find((hub) => hub.id === route.demandHubId);
    const hubDemand = demandHub?.monthlyDemand || demandHub?.forecastDemand || 0;
    return sum + (hubDemand * Math.max(0, route.allocationPct)) / 100;
  }, 0);
  const allocationUnits = supplier.included ? routedUnits : 0;
  const allocationPct = totalDemand ? (allocationUnits / totalDemand) * 100 : supplier.included ? supplier.allocation : 0;
  const primaryRoute = routes[0];
  const mode = primaryRoute?.mode ?? supplier.transportMode;
  const modeProfile = supplier.transportOverrides[mode];
  const routeWeighted = routes.reduce(
    (acc, route) => {
      const demandHub = scenario.demandHubs.find((hub) => hub.id === route.demandHubId);
      const units = ((demandHub?.monthlyDemand || demandHub?.forecastDemand || 0) * Math.max(0, route.allocationPct)) / 100;
      return {
        units: acc.units + units,
        freightCost: acc.freightCost + route.freightCost * units,
        transitTime: acc.transitTime + route.transitTime * units,
        delayProbability: acc.delayProbability + route.delayProbability * units,
        congestionRisk: acc.congestionRisk + route.portCongestionRisk * units,
        customsRisk: acc.customsRisk + route.customsRisk * units,
        emissionsFactor: acc.emissionsFactor + route.emissionsFactor * units,
      };
    },
    { units: 0, freightCost: 0, transitTime: 0, delayProbability: 0, congestionRisk: 0, customsRisk: 0, emissionsFactor: 0 },
  );
  const routeFactor = Math.max(1, routeWeighted.units);
  const routeProfile = {
    freightCost: routeWeighted.units ? routeWeighted.freightCost / routeFactor : modeProfile.freightCost || supplier.freightCost,
    transitTime: routeWeighted.units ? routeWeighted.transitTime / routeFactor : modeProfile.transitTime,
    delayProbability: routeWeighted.units ? routeWeighted.delayProbability / routeFactor : modeProfile.delayProbability,
    congestionRisk: routeWeighted.units ? routeWeighted.congestionRisk / routeFactor : modeProfile.congestionRisk,
    customsRisk: routeWeighted.units ? routeWeighted.customsRisk / routeFactor : 0,
    emissionsFactor: routeWeighted.units ? routeWeighted.emissionsFactor / routeFactor : modeProfile.emissionsFactor,
  };
  const risks = getSupplierRiskEvents(scenario, supplier, mode);
  const leverEffects = activeLeverEffects(scenario);
  const regionalRisk = scenario.regionalRiskProfiles.find((profile) => profile.country === supplier.country || profile.region === supplier.region);
  const probabilityBoost = risks.reduce((sum, risk) => sum + (risk.probability === "High" ? 1.15 : risk.probability === "Medium" ? 0.8 : 0.45), 0);
  const flexFactor = leverEffects.resilienceImpact > 0 ? 0.86 : 1;
  const dualFactor = leverEffects.resilienceImpact > 0 ? 0.9 : 1;
  const riskDelay = risks.reduce((sum, risk) => sum + risk.leadTimeImpactDays * flexFactor, 0);
  const riskReliabilityPenalty = risks.reduce((sum, risk) => sum + risk.reliabilityImpactPct * flexFactor, 0);
  const riskScoreImpact = risks.reduce((sum, risk) => sum + risk.riskScoreImpact * (probabilityBoost || 1) * flexFactor * dualFactor, 0);

  const baseCost = supplier.baseUnitCost * (1 + leverEffects.unitCostImpactPct / 100);

  let freightCost = routeProfile.freightCost || supplier.freightCost;
  const freightImpact = risks.reduce((sum, risk) => sum + risk.freightImpactPct, 0);
  freightCost *= 1 + (freightImpact + leverEffects.freightCostImpactPct) / 100;

  const tariffCost = baseCost * (supplier.tariffRate / 100);
  const insuranceCost = baseCost * (supplier.insuranceRate / 100);
  const costImpact = risks.reduce((sum, risk) => sum + risk.costImpactPct, 0);
  const politicalRisk = regionalRisk?.politicalRisk ?? supplier.politicalRisk;
  const currencyRisk = regionalRisk?.currencyRisk ?? supplier.currencyRisk;
  const naturalRisk = regionalRisk?.naturalDisasterRisk ?? supplier.naturalDisasterRisk;
  const regionalExtra = regionalRisk ? (regionalRisk.regulatoryRisk + regionalRisk.laborRisk + regionalRisk.infrastructureRisk) / 9 : 0;
  const geopoliticalRisk = politicalRisk * 0.3 + currencyRisk * 0.16 + naturalRisk * 0.18 + (100 - supplier.financialHealth) * 0.15 + regionalExtra;
  const logisticsRisk = routeProfile.delayProbability * 0.38 + routeProfile.congestionRisk * 0.34 + routeProfile.customsRisk * 0.28;
  const concentrationRisk = scenario.budget.maxSupplierAllocation && allocationPct > scenario.budget.maxSupplierAllocation ? 8 : 0;
  const lockInRisk = leverEffects.managementCostImpactPct > 3 ? 4 : 0;
  const riskScore = clamp(geopoliticalRisk + logisticsRisk * 0.35 + riskScoreImpact + concentrationRisk + lockInRisk, 0, 100);
  const riskPremium = (baseCost + freightCost) * (riskScore / 100) * 0.065;
  const managementCost = baseCost * (leverEffects.managementCostImpactPct / 100);
  const landedCost = (baseCost + freightCost + insuranceCost + tariffCost + riskPremium + managementCost) * (1 + costImpact / 100);
  const riskAdjustedCost = landedCost * (1 + riskScore / 100);

  let leadTime = supplier.leadTime + routeProfile.transitTime + riskDelay;
  leadTime *= 1 + leverEffects.leadTimeImpactPct / 100;

  let reliability = supplier.reliability - riskReliabilityPenalty + leverEffects.reliabilityImpactPct;
  reliability = clamp(reliability, 40, 99);

  const emissions = allocationUnits * routeProfile.emissionsFactor * (1 + leverEffects.emissionsImpactPct / 100);
  const esgScore = clamp(supplier.esgScore - routeProfile.emissionsFactor * 2, 0, 100);

  return {
    supplierId: supplier.id,
    supplierName: supplier.name,
    country: supplier.country,
    region: supplier.region,
    allocationPct,
    allocationUnits,
    included: supplier.included,
    mode,
    landedCost,
    riskAdjustedCost,
    leadTime,
    reliability,
    capacityUtilization: supplier.capacity ? allocationUnits / supplier.capacity : 0,
    emissions,
    riskScore,
    esgScore,
    activeRiskNames: risks.map((risk) => risk.name),
    capacityHeadroom: Math.max(0, supplier.capacity - allocationUnits),
  };
};

const buildForecast = (scenario: Scenario, base: Omit<PredictionResult, "forecast" | "warnings">): ForecastPoint[] => {
  const activeRiskPressure = scenario.riskEvents.filter((risk) => risk.active).reduce((sum, risk) => sum + risk.riskScoreImpact / 100, 0);
  const leverEffects = activeLeverEffects(scenario);
  const horizon = scenario.horizonDays;
  const points = [30, 60, 90, 180].filter((day) => day <= Math.max(horizon, 30));
  const uniquePoints = points.includes(horizon) ? points : [...points, horizon].sort((a, b) => a - b);

  return uniquePoints.map((day) => {
    const factor = day / 180;
    const costInflation = 1 + factor * ((scenario.forecastAssumptions.costInflationPct || 0) / 100 + activeRiskPressure * 0.035);
    const riskTrend = (activeRiskPressure * 10 + (scenario.forecastAssumptions.riskTrendPct || 0)) * factor;
    const demandGrowth = 1 + ((scenario.forecastAssumptions.demandGrowthPct || 0) / 100) * factor;
    return {
      day,
      cost: base.totalScenarioCost * costInflation * demandGrowth,
      risk: clamp(base.weightedRisk + riskTrend, 0, 100),
      leadTime: Math.max(0, base.avgLeadTime + activeRiskPressure * 4 * factor),
      serviceLevel: clamp(base.serviceLevel - activeRiskPressure * 3.5 * factor + leverEffects.serviceLevelImpact + (scenario.forecastAssumptions.serviceDriftPct || 0) * factor, 0, 99.5),
    };
  });
};

const buildDataCompleteness = (scenario: Scenario) => {
  const activeRoutes = scenario.routes.filter((route) => route.active);
  const checks: Array<{ complete: boolean; label: string }> = [];

  if (!scenario.suppliers.length) checks.push({ complete: false, label: "at least one supplier" });
  scenario.suppliers.forEach((supplier, index) => {
    const label = supplier.name || `supplier ${index + 1}`;
    checks.push({ complete: Boolean(supplier.name.trim()), label: `${label}: supplier name` });
    checks.push({ complete: supplier.baseUnitCost > 0, label: `${label}: supplier cost` });
    checks.push({ complete: supplier.capacity > 0, label: `${label}: supplier capacity` });
    checks.push({ complete: supplier.leadTime > 0, label: `${label}: lead time` });
    checks.push({ complete: supplier.reliability > 0 && supplier.reliability <= 100, label: `${label}: reliability` });
  });

  if (!scenario.demandHubs.length) checks.push({ complete: false, label: "at least one demand hub" });
  scenario.demandHubs.forEach((hub, index) => {
    const label = hub.name || `demand hub ${index + 1}`;
    checks.push({ complete: Boolean(hub.name.trim()), label: `${label}: demand hub name` });
    checks.push({ complete: (hub.monthlyDemand || hub.forecastDemand) > 0, label: `${label}: demand volume` });
  });

  if (!activeRoutes.length) checks.push({ complete: false, label: "at least one active route" });
  activeRoutes.forEach((route, index) => {
    const label = `${route.originLabel || "route"} to ${route.destinationLabel || index + 1}`;
    checks.push({ complete: Boolean(route.supplierId), label: `${label}: supplier` });
    checks.push({ complete: Boolean(route.demandHubId), label: `${label}: demand hub` });
    checks.push({ complete: route.freightCost > 0, label: `${label}: route cost` });
    checks.push({ complete: route.transitTime > 0, label: `${label}: route lead time` });
    checks.push({ complete: route.allocationPct > 0, label: `${label}: allocation percentage` });
  });

  const completed = checks.filter((check) => check.complete).length;
  return {
    confidenceScore: checks.length ? Math.round((completed / checks.length) * 100) : 0,
    missingDataFields: Array.from(new Set(checks.filter((check) => !check.complete).map((check) => check.label))).slice(0, 16),
  };
};

const buildWarnings = (scenario: Scenario, result: Omit<PredictionResult, "forecast" | "warnings">) => {
  const warnings: string[] = [];
  const hasMinimumNetwork = scenario.suppliers.length > 0 && scenario.demandHubs.length > 0 && scenario.routes.some((route) => route.active);
  if (!hasMinimumNetwork) {
    warnings.push("Predictions will appear once at least one supplier, one demand hub, and one active route are created.");
  }
  if (hasMinimumNetwork && result.missingDataFields.length) {
    warnings.push("Prediction incomplete: Add supplier cost, demand volume, route cost, and lead time to generate results.");
    warnings.push(`Missing data reducing confidence: ${result.missingDataFields.slice(0, 5).join(", ")}.`);
  }
  scenario.demandHubs.forEach((hub) => {
    const routeAllocation = scenario.routes.filter((route) => route.active && route.demandHubId === hub.id).reduce((sum, route) => sum + route.allocationPct, 0);
    if (routeAllocation > 0 && Math.abs(routeAllocation - 100) > 0.25) warnings.push(`${hub.name} route allocations total ${routeAllocation.toFixed(1)}%, not 100%.`);
    if ((hub.monthlyDemand || hub.forecastDemand) > 0 && routeAllocation === 0) warnings.push(`${hub.name || "Demand hub"} has demand but no active supplier route.`);
  });
  if (result.totalDemand > result.totalAvailableCapacity) warnings.push("Demand exceeds available included supplier capacity.");
  if (scenario.budget.budget > 0 && result.totalScenarioCost > scenario.budget.budget) warnings.push("Projected scenario cost exceeds budget.");
  if (scenario.budget.maxAverageLeadTime > 0 && result.avgLeadTime > scenario.budget.maxAverageLeadTime) warnings.push("Average lead time exceeds the maximum target.");
  if (scenario.budget.minServiceLevel > 0 && result.serviceLevel < scenario.budget.minServiceLevel) warnings.push("Predicted service level is below target.");
  if (scenario.budget.minEsgScore > 0 && result.esgAverage < scenario.budget.minEsgScore) warnings.push("Weighted ESG score is below the minimum target.");
  const concentrated = result.suppliers.find((supplier) => scenario.budget.maxSupplierAllocation > 0 && supplier.allocationPct > scenario.budget.maxSupplierAllocation);
  if (concentrated) warnings.push(`${concentrated.supplierName} exceeds the maximum allocation threshold.`);
  if (result.weightedRisk > 62) warnings.push("Weighted supplier risk is elevated under active events.");
  return warnings;
};

export const calculatePrediction = (scenario: Scenario): PredictionResult => {
  const totalDemand = getTotalDemand(scenario);
  const supplierPredictions = scenario.suppliers.map((supplier) => predictSupplier(scenario, supplier));
  const activePredictions = supplierPredictions.filter((supplier) => supplier.included && supplier.allocationUnits > 0);
  const totalScenarioCost = activePredictions.reduce((sum, supplier) => sum + supplier.allocationUnits * supplier.landedCost, 0);
  const riskAdjustedCost = activePredictions.reduce((sum, supplier) => sum + supplier.allocationUnits * supplier.riskAdjustedCost, 0);
  const totalUnits = activePredictions.reduce((sum, supplier) => sum + supplier.allocationUnits, 0);
  const totalAvailableCapacity = scenario.suppliers.filter((supplier) => supplier.included).reduce((sum, supplier) => sum + supplier.capacity, 0);
  const avgLandedCost = totalUnits ? totalScenarioCost / totalUnits : 0;
  const avgLeadTime = weightedAverage(activePredictions, "leadTime");
  const weightedRisk = weightedAverage(activePredictions, "riskScore");
  const weightedReliability = weightedAverage(activePredictions, "reliability");
  const esgAverage = weightedAverage(activePredictions, "esgScore");
  const capacityUtilization = totalAvailableCapacity ? totalUnits / totalAvailableCapacity : 0;
  const demandCoveragePct = totalDemand ? (totalUnits / totalDemand) * 100 : 0;
  const activeRegions = new Set(activePredictions.map((supplier) => supplier.region)).size;
  const activeModes = new Set(activePredictions.map((supplier) => supplier.mode)).size;
  const capacityHeadroomPct = totalAvailableCapacity ? clamp((totalAvailableCapacity - totalUnits) / totalAvailableCapacity, 0, 1) : 0;
  const resilienceScore = clamp(
    activePredictions.length * 8 +
      activeRegions * 7 +
      activeModes * 6 +
      weightedReliability * 0.18 +
      capacityHeadroomPct * 22 -
      weightedRisk * 0.22 +
      activeLeverEffects(scenario).resilienceImpact,
    0,
    100,
  );
  const shortageBase = Math.max(0, totalDemand - totalUnits);
  const shortageRisk = totalDemand ? clamp((shortageBase / Math.max(1, totalDemand)) * 100 + (100 - weightedReliability) * 0.28 + weightedRisk * 0.12, 0, 100) : 0;
  const inventory = scenario.demandHubs.reduce((sum, hub) => sum + hub.currentInventory, 0) || scenario.budget.currentInventory;
  const safetyCoverageDays = inventory / Math.max(1, totalDemand / 30);
  const serviceLevel = activePredictions.length
    ? clamp(
        weightedReliability -
          (scenario.budget.maxAverageLeadTime > 0 ? Math.max(0, avgLeadTime - scenario.budget.maxAverageLeadTime) * 0.5 : 0) -
          weightedRisk * 0.08 +
          safetyCoverageDays * 0.12 +
          (activePredictions.length - 1) * 1.1 +
          activeLeverEffects(scenario).serviceLevelImpact,
        0,
        99.5,
      )
    : 0;
  const completeness = buildDataCompleteness(scenario);

  const baseResult = {
    suppliers: supplierPredictions,
    totalScenarioCost,
    avgLandedCost,
    avgLeadTime,
    weightedRisk,
    serviceLevel,
    capacityUtilization,
    esgAverage,
    budgetUsedPct: scenario.budget.budget ? (totalScenarioCost / scenario.budget.budget) * 100 : 0,
    riskAdjustedCost,
    resilienceScore,
    shortageRisk,
    totalAvailableCapacity,
    totalDemand,
    demandCoveragePct,
    activeRouteCount: scenario.routes.filter((route) => route.active).length,
    activeSupplierCount: activePredictions.length,
    confidenceScore: completeness.confidenceScore,
    missingDataFields: completeness.missingDataFields,
  };

  return {
    ...baseResult,
    forecast: buildForecast(scenario, baseResult),
    warnings: buildWarnings(scenario, baseResult),
  };
};
