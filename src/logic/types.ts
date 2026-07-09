export type TransportMode = "Sea" | "Air" | "Land" | "Multimodal";

export type OptimizationGoal =
  | "Lowest cost"
  | "Lowest risk"
  | "Fastest lead time"
  | "Best balanced"
  | "Best ESG"
  | "Highest resilience";

export type Probability = "Low" | "Medium" | "High";
export type ConfidenceBand = "High" | "Medium" | "Low";

export interface Coordinates {
  x: number;
  y: number;
  lat?: number;
  lng?: number;
}

export interface TransportProfile {
  mode: TransportMode;
  freightCost: number;
  transitTime: number;
  delayProbability: number;
  emissionsFactor: number;
  congestionRisk: number;
}

export interface Supplier {
  id: string;
  name: string;
  country: string;
  region: string;
  productCategory: string;
  baseUnitCost: number;
  tariffRate: number;
  freightCost: number;
  insuranceRate: number;
  leadTime: number;
  reliability: number;
  capacity: number;
  moq: number;
  esgScore: number;
  politicalRisk: number;
  currencyRisk: number;
  naturalDisasterRisk: number;
  financialHealth: number;
  qualityScore: number;
  notes: string;
  allocation: number;
  included: boolean;
  transportMode: TransportMode;
  coordinates: Coordinates;
  transportOverrides: Record<TransportMode, TransportProfile>;
}

export interface DemandHub {
  id: string;
  name: string;
  country: string;
  region: string;
  monthlyDemand: number;
  forecastDemand: number;
  serviceLevelTarget: number;
  maxLeadTime: number;
  currentInventory: number;
  safetyStock: number;
  priorityLevel: "Low" | "Medium" | "High" | "Critical";
  requiredDeliveryDate: string;
  coordinates: Coordinates;
  notes: string;
}

export interface LogisticsHub {
  id: string;
  name: string;
  country: string;
  region: string;
  type: "Port" | "Airport" | "Rail terminal" | "Distribution center" | "Cross-dock";
  customsRisk: number;
  congestionRisk: number;
  handlingCost: number;
  dwellTimeDays: number;
  coordinates: Coordinates;
  notes: string;
}

export interface Route {
  id: string;
  supplierId: string;
  demandHubId: string;
  logisticsHubId?: string;
  originLabel: string;
  destinationLabel: string;
  mode: TransportMode;
  active: boolean;
  allocationPct: number;
  freightCost: number;
  transitTime: number;
  delayProbability: number;
  customsRisk: number;
  portCongestionRisk: number;
  emissionsFactor: number;
  distanceEstimate: number;
  from: Coordinates;
  to: Coordinates;
  via?: Coordinates;
}

export interface RiskEvent {
  id: string;
  name: string;
  description: string;
  affectedCountries: string[];
  affectedSupplierIds: string[];
  affectedModes: TransportMode[];
  costImpactPct: number;
  freightImpactPct: number;
  leadTimeImpactDays: number;
  reliabilityImpactPct: number;
  riskScoreImpact: number;
  affectedDemandHubIds: string[];
  severity: number;
  confidenceLevel: number;
  probability: Probability;
  durationDays: 30 | 60 | 90 | 180;
  active: boolean;
  coordinates: Coordinates;
}

export interface BudgetConstraints {
  monthlyDemand: number;
  budget: number;
  maxAverageLeadTime: number;
  minServiceLevel: number;
  maxSupplierAllocation: number;
  minEsgScore: number;
  safetyStockTarget: number;
  currentInventory: number;
  targetDeliveryDate: string;
}

export interface NegotiationLever {
  id: string;
  name: string;
  effect: string;
  active: boolean;
  unitCostImpactPct: number;
  freightCostImpactPct: number;
  leadTimeImpactPct: number;
  reliabilityImpactPct: number;
  resilienceImpact: number;
  serviceLevelImpact: number;
  emissionsImpactPct: number;
  managementCostImpactPct: number;
}

export interface WeightSettings {
  cost: number;
  leadTime: number;
  risk: number;
  reliability: number;
  esg: number;
  capacity: number;
  resilience: number;
}

export interface SupplierPrediction {
  supplierId: string;
  supplierName: string;
  country: string;
  region: string;
  allocationPct: number;
  allocationUnits: number;
  included: boolean;
  mode: TransportMode;
  landedCost: number;
  riskAdjustedCost: number;
  leadTime: number;
  reliability: number;
  capacityUtilization: number;
  emissions: number;
  riskScore: number;
  esgScore: number;
  activeRiskNames: string[];
  capacityHeadroom: number;
}

export interface ForecastPoint {
  day: number;
  cost: number;
  risk: number;
  leadTime: number;
  serviceLevel: number;
}

export interface ForecastAssumptions {
  demandGrowthPct: number;
  costInflationPct: number;
  riskTrendPct: number;
  serviceDriftPct: number;
  seasonalityNotes: string;
}

export interface RegionalRiskProfile {
  id: string;
  country: string;
  region: string;
  politicalRisk: number;
  currencyRisk: number;
  naturalDisasterRisk: number;
  regulatoryRisk: number;
  laborRisk: number;
  infrastructureRisk: number;
  notes: string;
}

export interface ProductDetails {
  name: string;
  sku: string;
  category: string;
  customCategory: string;
  descriptors: string;
  specification: string;
  complianceRequirements: string;
  qualityRequirements: string;
  unitOfMeasure: string;
  annualVolume: number;
  notes: string;
}

export interface ImportedFileSummary {
  id: string;
  fileName: string;
  fileType: string;
  status: "Mapped" | "Partial" | "Needs Manual Input";
  mappedFields: string[];
  manualInputs: string[];
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  change: string;
  reason: string;
  recommendationImpact: string;
}

export interface PredictionResult {
  suppliers: SupplierPrediction[];
  totalScenarioCost: number;
  avgLandedCost: number;
  avgLeadTime: number;
  weightedRisk: number;
  serviceLevel: number;
  capacityUtilization: number;
  esgAverage: number;
  budgetUsedPct: number;
  riskAdjustedCost: number;
  resilienceScore: number;
  shortageRisk: number;
  totalAvailableCapacity: number;
  totalDemand: number;
  demandCoveragePct: number;
  activeRouteCount: number;
  activeSupplierCount: number;
  confidenceScore: number;
  missingDataFields: string[];
  forecast: ForecastPoint[];
  warnings: string[];
}

export interface Recommendation {
  supplierMix: Record<string, number>;
  text: string;
  recommendedAllocation: string;
  whyThisPlan: string;
  recommendedAction: string;
  keyTradeoff: string;
  confidence: string;
  missingData: string[];
  finalDecision: "approve" | "revise" | "reject";
  bestLever: string;
  biggestRisk: string;
}

export interface ScenarioComparisonRow {
  name: string;
  totalCost: number;
  avgLandedCost: number;
  avgLeadTime: number;
  riskScore: number;
  serviceLevel: number;
  esg: number;
  resilience: number;
  capacityUtilization: number;
  mainTradeoff: string;
}

export interface SupplierScorecard {
  supplierId: string;
  supplierName: string;
  country: string;
  score: number;
  confidence: ConfidenceBand;
  sourceNote: string;
  recommendedAction: string;
  assumptions: string[];
  categories: Array<{ label: string; score: number; weight: number; direction: string }>;
  formula: string;
}

export interface StressTestRow {
  id: string;
  question: string;
  assumption: string;
  costDeltaPct: number;
  riskDelta: number;
  leadTimeDelta: number;
  serviceDelta: number;
  recommendedAction: string;
}

export interface Scenario {
  id: string;
  name: string;
  horizonDays: 30 | 60 | 90 | 180;
  optimizationGoal: OptimizationGoal;
  weights: WeightSettings;
  budget: BudgetConstraints;
  suppliers: Supplier[];
  demandHubs: DemandHub[];
  logisticsHubs: LogisticsHub[];
  routes: Route[];
  riskEvents: RiskEvent[];
  levers: NegotiationLever[];
  regionalRiskProfiles: RegionalRiskProfile[];
  forecastAssumptions: ForecastAssumptions;
  productDetails: ProductDetails;
  importedFiles: ImportedFileSummary[];
  auditTrail: AuditEntry[];
  updatedAt: string;
}
