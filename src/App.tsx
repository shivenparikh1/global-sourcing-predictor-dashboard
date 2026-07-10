import { useEffect, useMemo, useState } from "react";
import { appConfig } from "./appConfig";
import CommandMapTab from "./components/CommandMapTab";
import DataInputTab from "./components/DataInputTab";
import ForecastScenariosTab from "./components/ForecastScenariosTab";
import Header from "./components/Header";
import MetricsTab from "./components/MetricsTab";
import {
  DemandHubModal,
  ForecastAssumptionsModal,
  LogisticsHubModal,
  NegotiationLeverModal,
  RegionalRiskProfileModal,
  RouteLaneModal,
} from "./components/ManualRecordModals";
import ProductDetailsTab from "./components/ProductDetailsTab";
import RecommendationsTab from "./components/RecommendationsTab";
import ReportsTab from "./components/ReportsTab";
import RiskEventModal from "./components/RiskEventModal";
import RiskIntelligenceTab from "./components/RiskIntelligenceTab";
import SupplierDetailModal from "./components/SupplierDetailModal";
import TabNavigation, { type AppTab } from "./components/TabNavigation";
import type { MapLayers, MapMode, SelectedMapItem } from "./components/WorldMap";
import WorkflowCopilotTab from "./components/WorkflowCopilotTab";
import {
  loadActiveDashboardIndex,
  loadCurrentScenario,
  loadDashboardSlots,
  parseScenarioImport,
  persistActiveDashboardIndex,
  persistCurrentScenario,
  persistDashboardSlots,
  resetScenario,
  saveScenarioSnapshot,
} from "./logic/localStorage";
import { applyAllocation, buildRecommendedAllocation } from "./logic/optimizationEngine";
import { calculatePrediction } from "./logic/predictionEngine";
import { buildRecommendation } from "./logic/recommendationEngine";
import { createBlankNegotiationLever, createBlankScenario, createExampleScenario, modeDefaults } from "./logic/seedData";
import type { AuditEntry, Coordinates, DemandHub, LogisticsHub, NegotiationLever, RegionalRiskProfile, RiskEvent, Route, Scenario, Supplier } from "./logic/types";
import {
  applyIntakeToScenario,
  applyStrategyToScenario,
  buildStrategyComparisonRows,
  createBlankIntake,
  priorityToStrategy,
  type IntakeState,
  type SourcingStrategy,
} from "./logic/workflowIntelligence";

const nowStamp = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const cloneModeDefaults = () => ({
  Sea: { ...modeDefaults.Sea },
  Air: { ...modeDefaults.Air },
  Land: { ...modeDefaults.Land },
  Multimodal: { ...modeDefaults.Multimodal },
});

const describeScenarioChange = (previous: Scenario, next: Scenario) => {
  const changes: string[] = [];
  if (previous.suppliers.length !== next.suppliers.length) changes.push(`suppliers ${previous.suppliers.length} -> ${next.suppliers.length}`);
  if (previous.demandHubs.length !== next.demandHubs.length) changes.push(`demand hubs ${previous.demandHubs.length} -> ${next.demandHubs.length}`);
  if (previous.routes.length !== next.routes.length) changes.push(`routes ${previous.routes.length} -> ${next.routes.length}`);
  if (previous.riskEvents.length !== next.riskEvents.length) changes.push(`risks ${previous.riskEvents.length} -> ${next.riskEvents.length}`);
  if (previous.optimizationGoal !== next.optimizationGoal) changes.push(`goal ${previous.optimizationGoal} -> ${next.optimizationGoal}`);
  if (JSON.stringify(previous.weights) !== JSON.stringify(next.weights)) changes.push("optimization weights changed");
  if (JSON.stringify(previous.budget) !== JSON.stringify(next.budget)) changes.push("budget or capacity constraints changed");
  if (JSON.stringify(previous.forecastAssumptions) !== JSON.stringify(next.forecastAssumptions)) changes.push("forecast assumptions changed");
  if (JSON.stringify(previous.productDetails) !== JSON.stringify(next.productDetails)) changes.push("product details changed");
  if (!changes.length && JSON.stringify(previous.suppliers) !== JSON.stringify(next.suppliers)) changes.push("supplier data changed");
  if (!changes.length && JSON.stringify(previous.routes) !== JSON.stringify(next.routes)) changes.push("route data changed");
  if (!changes.length && JSON.stringify(previous.riskEvents) !== JSON.stringify(next.riskEvents)) changes.push("risk data changed");
  return changes.slice(0, 3).join("; ") || "workspace data updated";
};

const describeRecommendationImpact = (previous: Scenario, next: Scenario) => {
  const before = buildRecommendation(previous);
  const after = buildRecommendation(next);
  const changes: string[] = [];
  if (before.finalDecision !== after.finalDecision) changes.push(`decision ${before.finalDecision} -> ${after.finalDecision}`);
  if (before.biggestRisk !== after.biggestRisk) changes.push(`risk focus ${before.biggestRisk} -> ${after.biggestRisk}`);
  if (before.recommendedAction !== after.recommendedAction) changes.push(`action changed to "${after.recommendedAction}"`);
  if (before.recommendedAllocation !== after.recommendedAllocation) changes.push("recommended allocation changed");
  return changes.join("; ") || "recommendation unchanged";
};

const appendAuditEntry = (previous: Scenario, next: Scenario, reason: string): Scenario => {
  const at = new Date().toISOString();
  const entry: AuditEntry = {
    id: `audit-${Date.now()}`,
    at,
    change: describeScenarioChange(previous, next),
    reason,
    recommendationImpact: describeRecommendationImpact(previous, next),
  };
  return {
    ...next,
    auditTrail: [entry, ...(next.auditTrail ?? previous.auditTrail ?? [])].slice(0, 40),
    updatedAt: at,
  };
};

type PlacementCoordinates = Coordinates & { country?: string; region?: string };

const defaultMapLayers: MapLayers = {
  suppliers: true,
  demandHubs: true,
  logisticsHubs: true,
  routes: true,
  riskEvents: true,
  demandHeatmap: false,
  riskHeatmap: false,
};

const createNewSupplier = (coordinates: PlacementCoordinates = { x: 50, y: 45 }): Supplier => ({
  id: `supplier-${Date.now()}`,
  name: "",
  country: coordinates.country ?? "",
  region: coordinates.region ?? "",
  productCategory: "",
  baseUnitCost: 0,
  tariffRate: 0,
  freightCost: 0,
  insuranceRate: 0,
  leadTime: 0,
  reliability: 0,
  capacity: 0,
  moq: 0,
  esgScore: 0,
  politicalRisk: 0,
  currencyRisk: 0,
  naturalDisasterRisk: 0,
  financialHealth: 0,
  qualityScore: 0,
  notes: "",
  allocation: 0,
  included: true,
  transportMode: "Sea",
  coordinates,
  transportOverrides: cloneModeDefaults(),
});

const createNewRisk = (coordinates: PlacementCoordinates = { x: 50, y: 45 }): RiskEvent => ({
  id: `risk-${Date.now()}`,
  name: "",
  description: "",
  affectedCountries: coordinates.country ? [coordinates.country] : [],
  affectedSupplierIds: [],
  affectedDemandHubIds: [],
  affectedModes: [],
  costImpactPct: 0,
  freightImpactPct: 0,
  leadTimeImpactDays: 0,
  reliabilityImpactPct: 0,
  riskScoreImpact: 0,
  severity: 0,
  confidenceLevel: 0,
  probability: "Medium",
  durationDays: 30,
  active: false,
  coordinates,
});

const createNewDemandHub = (coordinates: PlacementCoordinates = { x: 18, y: 42 }): DemandHub => ({
  id: `demand-${Date.now()}`,
  name: "",
  country: coordinates.country ?? "",
  region: coordinates.region ?? "",
  monthlyDemand: 0,
  forecastDemand: 0,
  serviceLevelTarget: 0,
  maxLeadTime: 0,
  currentInventory: 0,
  safetyStock: 0,
  priorityLevel: "Medium",
  requiredDeliveryDate: "",
  coordinates,
  notes: "",
});

const createNewLogisticsHub = (coordinates: PlacementCoordinates = { x: 45, y: 45 }): LogisticsHub => ({
  id: `logistics-${Date.now()}`,
  name: "",
  country: coordinates.country ?? "",
  region: coordinates.region ?? "",
  type: "Port",
  customsRisk: 0,
  congestionRisk: 0,
  handlingCost: 0,
  dwellTimeDays: 0,
  coordinates,
  notes: "",
});

const createNewRoute = (scenario: Scenario): Route => {
  const supplier = scenario.suppliers[0];
  const hub = scenario.demandHubs[0];
  return {
    id: `route-${Date.now()}`,
    supplierId: supplier?.id ?? "",
    demandHubId: hub?.id ?? "",
    logisticsHubId: scenario.logisticsHubs[0]?.id,
    originLabel: supplier?.country || supplier?.name || "",
    destinationLabel: hub?.name || hub?.country || "",
    mode: supplier?.transportMode ?? "Sea",
    active: true,
    allocationPct: 0,
    freightCost: 0,
    transitTime: 0,
    delayProbability: 0,
    customsRisk: 0,
    portCongestionRisk: 0,
    emissionsFactor: 0,
    distanceEstimate: 0,
    from: supplier?.coordinates ?? { x: 50, y: 45 },
    to: hub?.coordinates ?? { x: 18, y: 42 },
    via: scenario.logisticsHubs[0]?.coordinates,
  };
};

const createNewRiskProfile = (): RegionalRiskProfile => ({
  id: `regional-risk-${Date.now()}`,
  country: "",
  region: "",
  politicalRisk: 0,
  currencyRisk: 0,
  naturalDisasterRisk: 0,
  regulatoryRisk: 0,
  laborRisk: 0,
  infrastructureRisk: 0,
  notes: "",
});

export default function App() {
  const initialDashboardState = useMemo(() => {
    const slots = loadDashboardSlots();
    const activeIndex = loadActiveDashboardIndex();
    return { slots, activeIndex, scenario: slots[activeIndex] ?? loadCurrentScenario() };
  }, []);
  const [dashboardSlots, setDashboardSlots] = useState<Scenario[]>(initialDashboardState.slots);
  const [activeDashboardIndex, setActiveDashboardIndex] = useState(initialDashboardState.activeIndex);
  const [scenario, setScenario] = useState<Scenario>(initialDashboardState.scenario);
  const [activeTab, setActiveTab] = useState<AppTab>("command");
  const [sourcingStrategy, setSourcingStrategy] = useState<SourcingStrategy>("balanced");
  const [intake, setIntake] = useState<IntakeState>(() => createBlankIntake());
  const [selectedMapItem, setSelectedMapItem] = useState<SelectedMapItem | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("select");
  const [mapLayers, setMapLayers] = useState<MapLayers>(defaultMapLayers);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [editingDemandHub, setEditingDemandHub] = useState<DemandHub | null>(null);
  const [isNewDemandHub, setIsNewDemandHub] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [isNewRoute, setIsNewRoute] = useState(false);
  const [editingLogisticsHub, setEditingLogisticsHub] = useState<LogisticsHub | null>(null);
  const [isNewLogisticsHub, setIsNewLogisticsHub] = useState(false);
  const [editingLever, setEditingLever] = useState<NegotiationLever | null>(null);
  const [isNewLever, setIsNewLever] = useState(false);
  const [editingRiskProfile, setEditingRiskProfile] = useState<RegionalRiskProfile | null>(null);
  const [isNewRiskProfile, setIsNewRiskProfile] = useState(false);
  const [editingForecast, setEditingForecast] = useState(false);
  const [editingRisk, setEditingRisk] = useState<RiskEvent | null>(null);
  const [isNewRisk, setIsNewRisk] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(nowStamp());

  useEffect(() => {
    persistCurrentScenario(scenario);
  }, [scenario]);

  useEffect(() => {
    persistDashboardSlots(dashboardSlots);
  }, [dashboardSlots]);

  const prediction = useMemo(() => calculatePrediction(scenario), [scenario]);
  const recommendation = useMemo(() => buildRecommendation(scenario), [scenario]);
  const comparisonRows = useMemo(() => buildStrategyComparisonRows(scenario, sourcingStrategy), [scenario, sourcingStrategy]);

  const replaceScenario = (next: Scenario, reason = "Workspace data updated") => {
    const touched = appendAuditEntry(scenario, next, reason);
    setScenario(touched);
    setDashboardSlots((slots) => slots.map((slot, index) => (index === activeDashboardIndex ? touched : slot)));
  };

  const updateScenario = (next: Scenario, reason?: string) => replaceScenario(next, reason);

  const switchDashboard = (index: number) => {
    setActiveDashboardIndex(index);
    persistActiveDashboardIndex(index);
    setScenario(dashboardSlots[index]);
    setSelectedMapItem(null);
    setMapMode("select");
    setSourcingStrategy("balanced");
    setIntake(createBlankIntake());
    setGeneratedAt(nowStamp());
  };

  const resetExampleDashboard = () => {
    const example = createExampleScenario();
    const exampleIndex = dashboardSlots.length - 1;
    setDashboardSlots((slots) => slots.map((slot, index) => (index === exampleIndex ? example : slot)));
    if (activeDashboardIndex === exampleIndex) {
      setScenario(example);
      setSelectedMapItem(null);
      setMapMode("select");
      setSourcingStrategy("balanced");
      setIntake(createBlankIntake());
      setGeneratedAt(nowStamp());
    }
  };

  const routeDisabledReason =
    !scenario.suppliers.length || !scenario.demandHubs.length ? "Add at least one supplier and one demand hub before creating a route." : "";

  const updateSupplier = (updated: Supplier) => {
    updateScenario({
      ...scenario,
      suppliers: scenario.suppliers.map((supplier) => (supplier.id === updated.id ? updated : supplier)),
      routes: scenario.routes.map((route) =>
        route.supplierId === updated.id ? { ...route, mode: updated.transportMode, from: updated.coordinates, originLabel: updated.country || updated.name } : route,
      ),
    }, "Supplier record updated");
  };

  const saveSupplier = (supplier: Supplier) => {
    const exists = scenario.suppliers.some((item) => item.id === supplier.id);
    updateScenario(
      {
        ...scenario,
        suppliers: exists ? scenario.suppliers.map((item) => (item.id === supplier.id ? supplier : item)) : [...scenario.suppliers, supplier],
        routes: scenario.routes.map((route) =>
          route.supplierId === supplier.id ? { ...route, mode: supplier.transportMode, from: supplier.coordinates, originLabel: supplier.country || supplier.name } : route,
        ),
      },
      exists ? "Supplier record updated" : "Supplier added",
    );
    setSelectedMapItem({ type: "supplier", id: supplier.id });
    setEditingSupplier(null);
    setIsNewSupplier(false);
  };

  const deleteSupplier = (supplierId: string) => {
    updateScenario(
      {
        ...scenario,
        suppliers: scenario.suppliers.filter((supplier) => supplier.id !== supplierId),
        routes: scenario.routes.filter((route) => route.supplierId !== supplierId),
        riskEvents: scenario.riskEvents.map((risk) => ({ ...risk, affectedSupplierIds: risk.affectedSupplierIds.filter((id) => id !== supplierId) })),
      },
      "Supplier removed",
    );
    if (selectedMapItem?.type === "supplier" && selectedMapItem.id === supplierId) setSelectedMapItem(null);
    setEditingSupplier(null);
  };

  const saveRisk = (risk: RiskEvent) => {
    const exists = scenario.riskEvents.some((item) => item.id === risk.id);
    updateScenario(
      {
        ...scenario,
        riskEvents: exists ? scenario.riskEvents.map((item) => (item.id === risk.id ? risk : item)) : [...scenario.riskEvents, risk],
      },
      exists ? "Risk event updated" : "Risk event added",
    );
    setSelectedMapItem({ type: "risk", id: risk.id });
    setEditingRisk(null);
    setIsNewRisk(false);
  };

  const deleteRisk = (riskId: string) => {
    updateScenario({ ...scenario, riskEvents: scenario.riskEvents.filter((risk) => risk.id !== riskId) }, "Risk event deleted");
    if (selectedMapItem?.type === "risk" && selectedMapItem.id === riskId) setSelectedMapItem(null);
    setEditingRisk(null);
  };

  const saveDemandHub = (hub: DemandHub) => {
    const exists = scenario.demandHubs.some((item) => item.id === hub.id);
    updateScenario(
      {
        ...scenario,
        demandHubs: exists ? scenario.demandHubs.map((item) => (item.id === hub.id ? hub : item)) : [...scenario.demandHubs, hub],
        routes: scenario.routes.map((route) => (route.demandHubId === hub.id ? { ...route, destinationLabel: hub.name || hub.country, to: hub.coordinates } : route)),
      },
      exists ? "Demand hub updated" : "Demand hub added",
    );
    setSelectedMapItem({ type: "demandHub", id: hub.id });
    setEditingDemandHub(null);
    setIsNewDemandHub(false);
  };

  const deleteDemandHub = (hubId: string) => {
    updateScenario(
      {
        ...scenario,
        demandHubs: scenario.demandHubs.filter((hub) => hub.id !== hubId),
        routes: scenario.routes.filter((route) => route.demandHubId !== hubId),
        riskEvents: scenario.riskEvents.map((risk) => ({ ...risk, affectedDemandHubIds: risk.affectedDemandHubIds.filter((id) => id !== hubId) })),
      },
      "Demand hub removed",
    );
    if (selectedMapItem?.type === "demandHub" && selectedMapItem.id === hubId) setSelectedMapItem(null);
    setEditingDemandHub(null);
  };

  const saveRoute = (route: Route) => {
    const exists = scenario.routes.some((item) => item.id === route.id);
    const supplier = scenario.suppliers.find((item) => item.id === route.supplierId);
    const demandHub = scenario.demandHubs.find((item) => item.id === route.demandHubId);
    const logisticsHub = scenario.logisticsHubs.find((item) => item.id === route.logisticsHubId);
    const normalized: Route = {
      ...route,
      originLabel: supplier?.country || supplier?.name || route.originLabel,
      destinationLabel: demandHub?.name || demandHub?.country || route.destinationLabel,
      from: supplier?.coordinates || route.from,
      to: demandHub?.coordinates || route.to,
      via: logisticsHub?.coordinates || route.via,
    };
    updateScenario({ ...scenario, routes: exists ? scenario.routes.map((item) => (item.id === route.id ? normalized : item)) : [...scenario.routes, normalized] }, exists ? "Route lane updated" : "Route lane created");
    setSelectedMapItem({ type: "route", id: route.id });
    setEditingRoute(null);
    setIsNewRoute(false);
  };

  const deleteRoute = (routeId: string) => {
    updateScenario({ ...scenario, routes: scenario.routes.filter((route) => route.id !== routeId) }, "Route lane deleted");
    if (selectedMapItem?.type === "route" && selectedMapItem.id === routeId) setSelectedMapItem(null);
    setEditingRoute(null);
  };

  const saveLogisticsHub = (hub: LogisticsHub) => {
    const exists = scenario.logisticsHubs.some((item) => item.id === hub.id);
    updateScenario(
      {
        ...scenario,
        logisticsHubs: exists ? scenario.logisticsHubs.map((item) => (item.id === hub.id ? hub : item)) : [...scenario.logisticsHubs, hub],
        routes: scenario.routes.map((route) => (route.logisticsHubId === hub.id ? { ...route, via: hub.coordinates } : route)),
      },
      exists ? "Logistics hub updated" : "Logistics hub added",
    );
    setSelectedMapItem({ type: "logisticsHub", id: hub.id });
    setEditingLogisticsHub(null);
    setIsNewLogisticsHub(false);
  };

  const deleteLogisticsHub = (hubId: string) => {
    updateScenario(
      {
        ...scenario,
        logisticsHubs: scenario.logisticsHubs.filter((hub) => hub.id !== hubId),
        routes: scenario.routes.map((route) => (route.logisticsHubId === hubId ? { ...route, logisticsHubId: undefined, via: undefined } : route)),
      },
      "Logistics hub removed",
    );
    if (selectedMapItem?.type === "logisticsHub" && selectedMapItem.id === hubId) setSelectedMapItem(null);
    setEditingLogisticsHub(null);
  };

  const saveLever = (lever: NegotiationLever) => {
    const exists = scenario.levers.some((item) => item.id === lever.id);
    updateScenario({ ...scenario, levers: exists ? scenario.levers.map((item) => (item.id === lever.id ? lever : item)) : [...scenario.levers, lever] }, exists ? "Negotiation lever updated" : "Negotiation lever added");
    setEditingLever(null);
    setIsNewLever(false);
  };

  const deleteLever = (leverId: string) => {
    updateScenario({ ...scenario, levers: scenario.levers.filter((lever) => lever.id !== leverId) }, "Negotiation lever deleted");
    setEditingLever(null);
  };

  const saveRiskProfile = (profile: RegionalRiskProfile) => {
    const exists = scenario.regionalRiskProfiles.some((item) => item.id === profile.id);
    updateScenario(
      {
        ...scenario,
        regionalRiskProfiles: exists ? scenario.regionalRiskProfiles.map((item) => (item.id === profile.id ? profile : item)) : [...scenario.regionalRiskProfiles, profile],
      },
      exists ? "Regional risk profile updated" : "Regional risk profile added",
    );
    setEditingRiskProfile(null);
    setIsNewRiskProfile(false);
  };

  const deleteRiskProfile = (profileId: string) => {
    updateScenario({ ...scenario, regionalRiskProfiles: scenario.regionalRiskProfiles.filter((profile) => profile.id !== profileId) }, "Regional risk profile deleted");
    setEditingRiskProfile(null);
  };

  const saveScenario = () => {
    const saved = saveScenarioSnapshot(scenario);
    replaceScenario(saved, "Scenario saved");
  };

  const exportScenario = () => {
    const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const scenarioSlug = scenario.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    anchor.download = `${appConfig.exportFilePrefix}-${scenarioSlug}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importScenario = async (file: File) => {
    try {
      const imported = parseScenarioImport(await file.text());
      replaceScenario(imported, "Scenario JSON imported");
      setSelectedMapItem(null);
      setMapMode("select");
      setSourcingStrategy("balanced");
      setIntake(createBlankIntake());
      setGeneratedAt(nowStamp());
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not import scenario JSON.");
    }
  };

  const applyRecommendation = () => {
    const allocation = buildRecommendedAllocation(scenario, scenario.optimizationGoal);
    const hasAllocation = Object.values(allocation).some((value) => value > 0);
    if (!hasAllocation) {
      window.alert("This recommendation is provisional. Fill supplier, demand, route, cost, capacity, and lead-time inputs before applying an allocation.");
      setGeneratedAt(nowStamp());
      return;
    }
    updateScenario(applyAllocation(scenario, allocation), "Recommended allocation applied");
    setGeneratedAt(nowStamp());
  };

  const changeStrategy = (nextStrategy: SourcingStrategy) => {
    setSourcingStrategy(nextStrategy);
    updateScenario(applyStrategyToScenario(scenario, nextStrategy), "Sourcing strategy changed");
    setGeneratedAt(nowStamp());
  };

  const applyIntake = (nextIntake: IntakeState) => {
    setIntake(nextIntake);
    setSourcingStrategy(priorityToStrategy(nextIntake.priority));
    updateScenario(applyIntakeToScenario(scenario, nextIntake), "Workflow intake applied");
    setGeneratedAt(nowStamp());
  };

  const openDemandHubForm = (coordinates?: Coordinates) => {
    setEditingDemandHub(createNewDemandHub(coordinates));
    setIsNewDemandHub(true);
  };

  const openSupplierForm = (coordinates?: Coordinates) => {
    setEditingSupplier(createNewSupplier(coordinates));
    setIsNewSupplier(true);
  };

  const openLogisticsHubForm = (coordinates?: Coordinates) => {
    setEditingLogisticsHub(createNewLogisticsHub(coordinates));
    setIsNewLogisticsHub(true);
  };

  const openRiskForm = (coordinates?: Coordinates) => {
    setEditingRisk(createNewRisk(coordinates));
    setIsNewRisk(true);
  };

  const openRouteForm = () => {
    if (routeDisabledReason) {
      window.alert(routeDisabledReason);
      return;
    }
    setEditingRoute(createNewRoute(scenario));
    setIsNewRoute(true);
  };

  return (
    <div className="min-h-screen p-3 text-slate-100 sm:p-4">
      <div className="mx-auto flex max-w-[1900px] flex-col gap-3">
        <Header
          scenario={scenario}
          dashboardSlots={dashboardSlots}
          activeDashboardIndex={activeDashboardIndex}
          onSelectDashboard={switchDashboard}
          onUpdateScenario={updateScenario}
          onSaveScenario={saveScenario}
          onResetScenario={() => {
            const blank = resetScenario();
            replaceScenario(blank, "Workspace cleared");
            setSelectedMapItem(null);
            setMapMode("select");
            setSourcingStrategy("balanced");
            setIntake(createBlankIntake());
          }}
          onResetExampleDashboard={resetExampleDashboard}
          onImportScenario={importScenario}
          onExportScenario={exportScenario}
        />
        <div className="sticky top-0 z-40 bg-ink-950/[0.82] py-2 backdrop-blur-xl">
          <TabNavigation activeTab={activeTab} scenario={scenario} prediction={prediction} onChange={setActiveTab} />
        </div>

        <main data-testid={`tab-panel-${activeTab}`} className="min-w-0">
          {activeTab === "command" && (
            <CommandMapTab
              scenario={scenario}
              prediction={prediction}
              recommendation={recommendation}
              generatedAt={generatedAt}
              selectedItem={selectedMapItem}
              mapMode={mapMode}
              layers={mapLayers}
              routeDisabledReason={routeDisabledReason}
              onModeChange={setMapMode}
              onLayerChange={setMapLayers}
              onSelectItem={setSelectedMapItem}
              onAddSupplierAt={openSupplierForm}
              onAddDemandHubAt={openDemandHubForm}
              onAddLogisticsHubAt={openLogisticsHubForm}
              onAddRiskAt={openRiskForm}
              onCreateRoute={openRouteForm}
              onEditSupplier={(supplier) => {
                setEditingSupplier(supplier);
                setIsNewSupplier(false);
              }}
              onDeleteSupplier={deleteSupplier}
              onEditDemandHub={(hub) => {
                setEditingDemandHub(hub);
                setIsNewDemandHub(false);
              }}
              onDeleteDemandHub={deleteDemandHub}
              onEditLogisticsHub={(hub) => {
                setEditingLogisticsHub(hub);
                setIsNewLogisticsHub(false);
              }}
              onDeleteLogisticsHub={deleteLogisticsHub}
              onEditRoute={(route) => {
                setEditingRoute(route);
                setIsNewRoute(false);
              }}
              onDeleteRoute={deleteRoute}
              onEditRisk={(risk) => {
                setEditingRisk(risk);
                setIsNewRisk(false);
              }}
              onDeactivateRisk={(risk) => saveRisk({ ...risk, active: false })}
              onDeleteRisk={deleteRisk}
              onGenerateRecommendation={() => setGeneratedAt(nowStamp())}
              onApplyRecommendation={applyRecommendation}
            />
          )}

          {activeTab === "workflow" && (
            <WorkflowCopilotTab
              scenario={scenario}
              prediction={prediction}
              recommendation={recommendation}
              strategy={sourcingStrategy}
              intake={intake}
              onStrategyChange={changeStrategy}
              onIntakeApply={applyIntake}
              onJumpToTab={setActiveTab}
              onAddSupplier={() => openSupplierForm()}
              onAddDemandHub={() => openDemandHubForm()}
              onAddRoute={openRouteForm}
              onAddRisk={() => openRiskForm()}
              onAddLever={() => {
                setEditingLever(createBlankNegotiationLever());
                setIsNewLever(true);
              }}
              onEditForecast={() => setEditingForecast(true)}
              onGenerateRecommendation={() => setGeneratedAt(nowStamp())}
            />
          )}

          {activeTab === "data" && (
            <DataInputTab
              scenario={scenario}
              routeDisabledReason={routeDisabledReason}
              onUpdateScenario={updateScenario}
              onAddSupplier={() => openSupplierForm()}
              onEditSupplier={(supplier) => {
                setEditingSupplier(supplier);
                setIsNewSupplier(false);
              }}
              onAddDemandHub={() => openDemandHubForm()}
              onEditDemandHub={(hub) => {
                setEditingDemandHub(hub);
                setIsNewDemandHub(false);
              }}
              onAddRoute={openRouteForm}
              onEditRoute={(route) => {
                setEditingRoute(route);
                setIsNewRoute(false);
              }}
              onAddLogisticsHub={() => openLogisticsHubForm()}
              onEditLogisticsHub={(hub) => {
                setEditingLogisticsHub(hub);
                setIsNewLogisticsHub(false);
              }}
              onAddRisk={() => openRiskForm()}
              onEditRisk={(risk) => {
                setEditingRisk(risk);
                setIsNewRisk(false);
              }}
              onAddLever={() => {
                setEditingLever(createBlankNegotiationLever());
                setIsNewLever(true);
              }}
              onEditLever={(lever) => {
                setEditingLever(lever);
                setIsNewLever(false);
              }}
              onAddRiskProfile={() => {
                setEditingRiskProfile(createNewRiskProfile());
                setIsNewRiskProfile(true);
              }}
              onEditRiskProfile={(profile) => {
                setEditingRiskProfile(profile);
                setIsNewRiskProfile(false);
              }}
              onEditForecast={() => setEditingForecast(true)}
            />
          )}

          {activeTab === "product" && <ProductDetailsTab scenario={scenario} onUpdateScenario={updateScenario} />}

          {activeTab === "metrics" && <MetricsTab scenario={scenario} prediction={prediction} />}

          {activeTab === "risk" && (
            <RiskIntelligenceTab
              scenario={scenario}
              prediction={prediction}
              onUpdateScenario={updateScenario}
              onAddRisk={() => openRiskForm()}
              onEditRisk={(risk) => {
                setEditingRisk(risk);
                setIsNewRisk(false);
              }}
              onChangeRisk={saveRisk}
            />
          )}

          {activeTab === "forecast" && (
            <ForecastScenariosTab
              scenario={scenario}
              prediction={prediction}
              comparisonRows={comparisonRows}
              onEditForecast={() => setEditingForecast(true)}
              onChangeGoal={(optimizationGoal) => updateScenario({ ...scenario, optimizationGoal }, "Optimization goal changed")}
              onChangeWeights={(weights) => updateScenario({ ...scenario, weights }, "Scoring weights changed")}
            />
          )}

          {activeTab === "recommendations" && (
            <RecommendationsTab
              scenario={scenario}
              prediction={prediction}
              recommendation={recommendation}
              strategy={sourcingStrategy}
              generatedAt={generatedAt}
              onGenerate={() => setGeneratedAt(nowStamp())}
              onApply={applyRecommendation}
            />
          )}

          {activeTab === "reports" && <ReportsTab scenario={scenario} prediction={prediction} recommendation={recommendation} strategy={sourcingStrategy} />}
        </main>
      </div>

      <SupplierDetailModal
        supplier={editingSupplier}
        isNew={isNewSupplier}
        onClose={() => {
          setEditingSupplier(null);
          setIsNewSupplier(false);
        }}
        onSave={saveSupplier}
        onDelete={deleteSupplier}
      />
      <RiskEventModal
        risk={editingRisk}
        suppliers={scenario.suppliers}
        demandHubs={scenario.demandHubs}
        isNew={isNewRisk}
        onClose={() => {
          setEditingRisk(null);
          setIsNewRisk(false);
        }}
        onSave={saveRisk}
        onDelete={deleteRisk}
      />
      <DemandHubModal
        value={editingDemandHub}
        isNew={isNewDemandHub}
        onClose={() => {
          setEditingDemandHub(null);
          setIsNewDemandHub(false);
        }}
        onSave={saveDemandHub}
        onDelete={deleteDemandHub}
      />
      <RouteLaneModal
        value={editingRoute}
        scenario={scenario}
        isNew={isNewRoute}
        onClose={() => {
          setEditingRoute(null);
          setIsNewRoute(false);
        }}
        onSave={saveRoute}
        onDelete={deleteRoute}
      />
      <LogisticsHubModal
        value={editingLogisticsHub}
        isNew={isNewLogisticsHub}
        onClose={() => {
          setEditingLogisticsHub(null);
          setIsNewLogisticsHub(false);
        }}
        onSave={saveLogisticsHub}
        onDelete={deleteLogisticsHub}
      />
      <NegotiationLeverModal
        value={editingLever}
        isNew={isNewLever}
        onClose={() => {
          setEditingLever(null);
          setIsNewLever(false);
        }}
        onSave={saveLever}
        onDelete={deleteLever}
      />
      <RegionalRiskProfileModal
        value={editingRiskProfile}
        isNew={isNewRiskProfile}
        onClose={() => {
          setEditingRiskProfile(null);
          setIsNewRiskProfile(false);
        }}
        onSave={saveRiskProfile}
        onDelete={deleteRiskProfile}
      />
      <ForecastAssumptionsModal
        value={editingForecast ? scenario.forecastAssumptions : null}
        onClose={() => setEditingForecast(false)}
        onSave={(forecastAssumptions) => {
          updateScenario({ ...scenario, forecastAssumptions }, "Forecast assumptions updated");
          setEditingForecast(false);
        }}
      />
    </div>
  );
}
