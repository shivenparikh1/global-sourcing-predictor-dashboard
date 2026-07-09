import {
  Activity,
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Gauge,
  Layers,
  Leaf,
  MapPinned,
  RadioTower,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";
import type { DemandHub, LogisticsHub, PredictionResult, Recommendation, RiskEvent, Route as RouteType, Scenario, Supplier } from "../logic/types";
import EmptyState from "./EmptyState";
import { currency, pct } from "./format";
import WorldMap, { type MapLayerKey, type MapLayers, type MapMode, type SelectedMapItem } from "./WorldMap";

interface CommandMapTabProps {
  scenario: Scenario;
  prediction: PredictionResult;
  recommendation: Recommendation;
  generatedAt: string;
  selectedItem: SelectedMapItem | null;
  mapMode: MapMode;
  layers: MapLayers;
  routeDisabledReason?: string;
  onModeChange: (mode: MapMode) => void;
  onLayerChange: (layers: MapLayers) => void;
  onSelectItem: (item: SelectedMapItem | null) => void;
  onAddSupplierAt: (coordinates: Supplier["coordinates"]) => void;
  onAddDemandHubAt: (coordinates: DemandHub["coordinates"]) => void;
  onAddLogisticsHubAt: (coordinates: LogisticsHub["coordinates"]) => void;
  onAddRiskAt: (coordinates: RiskEvent["coordinates"]) => void;
  onCreateRoute: () => void;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplierId: string) => void;
  onEditDemandHub: (hub: DemandHub) => void;
  onDeleteDemandHub: (hubId: string) => void;
  onEditLogisticsHub: (hub: LogisticsHub) => void;
  onDeleteLogisticsHub: (hubId: string) => void;
  onEditRoute: (route: RouteType) => void;
  onDeleteRoute: (routeId: string) => void;
  onEditRisk: (risk: RiskEvent) => void;
  onDeactivateRisk: (risk: RiskEvent) => void;
  onDeleteRisk: (riskId: string) => void;
  onGenerateRecommendation: () => void;
  onApplyRecommendation: () => void;
}

export default function CommandMapTab({
  scenario,
  prediction,
  recommendation,
  generatedAt,
  selectedItem,
  mapMode,
  layers,
  routeDisabledReason,
  onModeChange,
  onLayerChange,
  onSelectItem,
  onAddSupplierAt,
  onAddDemandHubAt,
  onAddLogisticsHubAt,
  onAddRiskAt,
  onCreateRoute,
  onEditSupplier,
  onDeleteSupplier,
  onEditDemandHub,
  onDeleteDemandHub,
  onEditLogisticsHub,
  onDeleteLogisticsHub,
  onEditRoute,
  onDeleteRoute,
  onEditRisk,
  onDeactivateRisk,
  onDeleteRisk,
  onGenerateRecommendation,
  onApplyRecommendation,
}: CommandMapTabProps) {
  const hasPrediction = prediction.activeSupplierCount > 0 && prediction.totalDemand > 0 && prediction.activeRouteCount > 0 && prediction.confidenceScore >= 60;

  return (
    <div className="grid min-h-[calc(100vh-8.4rem)] gap-3 xl:grid-cols-[minmax(13rem,18fr)_minmax(38rem,62fr)_minmax(15rem,20fr)]">
      <div className="order-2 xl:order-1">
        <ScorecardSidebar prediction={prediction} hasPrediction={hasPrediction} />
      </div>

      <div className="order-1 grid min-h-[38rem] grid-rows-[1fr_auto] gap-3 xl:order-2">
        <WorldMap
          scenario={scenario}
          prediction={prediction}
          selectedItem={selectedItem}
          mapMode={mapMode}
          layers={layers}
          routeDisabledReason={routeDisabledReason}
          onModeChange={onModeChange}
          onLayerChange={onLayerChange}
          onSelectItem={onSelectItem}
          onAddSupplierAt={onAddSupplierAt}
          onAddDemandHubAt={onAddDemandHubAt}
          onAddLogisticsHubAt={onAddLogisticsHubAt}
          onAddRiskAt={onAddRiskAt}
          onCreateRoute={onCreateRoute}
        />
        <BottomDecisionStrip
          prediction={prediction}
          recommendation={recommendation}
          generatedAt={generatedAt}
          onGenerate={onGenerateRecommendation}
          onApply={onApplyRecommendation}
        />
      </div>

      <div className="order-3">
        <MapDetailsPanel
          scenario={scenario}
          prediction={prediction}
          recommendation={recommendation}
          selectedItem={selectedItem}
          layers={layers}
          onLayerChange={onLayerChange}
          onModeChange={onModeChange}
          onCreateRoute={onCreateRoute}
          routeDisabledReason={routeDisabledReason}
          onEditSupplier={onEditSupplier}
          onDeleteSupplier={onDeleteSupplier}
          onEditDemandHub={onEditDemandHub}
          onDeleteDemandHub={onDeleteDemandHub}
          onEditLogisticsHub={onEditLogisticsHub}
          onDeleteLogisticsHub={onDeleteLogisticsHub}
          onEditRoute={onEditRoute}
          onDeleteRoute={onDeleteRoute}
          onEditRisk={onEditRisk}
          onDeactivateRisk={onDeactivateRisk}
          onDeleteRisk={onDeleteRisk}
        />
      </div>
    </div>
  );
}

function ScorecardSidebar({ prediction, hasPrediction }: { prediction: PredictionResult; hasPrediction: boolean }) {
  const cards = useMemo(
    () => [
      { label: "Landed Cost", value: hasPrediction ? currency(prediction.totalScenarioCost) : "No data", status: hasPrediction ? "Calculated" : "No data", tone: hasPrediction ? "good" : "muted", icon: CircleDollarSign },
      { label: "Lead Time", value: hasPrediction ? `${prediction.avgLeadTime.toFixed(1)}d` : "Incomplete", status: hasPrediction ? "Weighted" : "Need routes", tone: hasPrediction ? "good" : "warn", icon: Route },
      { label: "Risk", value: hasPrediction ? prediction.weightedRisk.toFixed(1) : "No data", status: hasPrediction ? (prediction.weightedRisk > 62 ? "Elevated" : "Stable") : "Incomplete", tone: hasPrediction && prediction.weightedRisk > 62 ? "risk" : hasPrediction ? "good" : "warn", icon: Gauge },
      { label: "Service", value: hasPrediction ? pct(prediction.serviceLevel) : "Incomplete", status: hasPrediction ? "Predicted" : "Need demand", tone: hasPrediction && prediction.serviceLevel >= 88 ? "good" : "warn", icon: ShieldCheck },
      { label: "Capacity", value: hasPrediction ? pct(prediction.capacityUtilization * 100) : "Incomplete", status: hasPrediction ? "Utilized" : "Need capacity", tone: prediction.capacityUtilization > 1 ? "risk" : hasPrediction ? "good" : "warn", icon: Boxes },
      { label: "Budget", value: hasPrediction && prediction.budgetUsedPct > 0 ? pct(prediction.budgetUsedPct) : "No data", status: prediction.budgetUsedPct > 100 ? "Exceeded" : hasPrediction ? "Within target" : "Incomplete", tone: prediction.budgetUsedPct > 100 ? "risk" : hasPrediction ? "good" : "warn", icon: Activity },
      { label: "Resilience", value: hasPrediction ? prediction.resilienceScore.toFixed(0) : "Incomplete", status: hasPrediction ? "Network" : "Need routes", tone: hasPrediction && prediction.resilienceScore >= 70 ? "good" : "warn", icon: Sparkles },
      { label: "Confidence", value: pct(prediction.confidenceScore), status: prediction.confidenceScore >= 90 ? "High" : prediction.confidenceScore >= 60 ? "Medium" : "Incomplete", tone: prediction.confidenceScore >= 90 ? "good" : prediction.confidenceScore >= 60 ? "warn" : "muted", icon: Target },
    ],
    [hasPrediction, prediction],
  );

  return (
    <aside className="panel animate-panel-in h-full overflow-hidden p-2.5">
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-white">Command Metrics</h2>
        <p className="text-xs text-slate-500">Live network readout</p>
      </div>
      <div className="grid gap-1.5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-md border border-slate-500/15 bg-slate-300/[0.035] p-2.5 transition duration-200 hover:border-slate-300/25 hover:bg-slate-300/[0.055]">
              <div className="flex items-center gap-2">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border ${metricTone(card.tone).icon}`}>
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[0.7rem] font-medium text-slate-400">{card.label}</p>
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[0.58rem] font-semibold ${metricTone(card.tone).chip}`}>{card.status}</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm font-semibold text-white">{card.value}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}

function MapDetailsPanel({
  scenario,
  prediction,
  recommendation,
  selectedItem,
  layers,
  onLayerChange,
  onModeChange,
  onCreateRoute,
  routeDisabledReason,
  onEditSupplier,
  onEditDemandHub,
  onEditLogisticsHub,
  onEditRoute,
  onEditRisk,
  onDeleteSupplier,
  onDeleteDemandHub,
  onDeleteLogisticsHub,
  onDeleteRoute,
  onDeactivateRisk,
  onDeleteRisk,
}: {
  scenario: Scenario;
  prediction: PredictionResult;
  recommendation: Recommendation;
  selectedItem: SelectedMapItem | null;
  layers: MapLayers;
  onLayerChange: (layers: MapLayers) => void;
  onModeChange: (mode: MapMode) => void;
  onCreateRoute: () => void;
  routeDisabledReason?: string;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplierId: string) => void;
  onEditDemandHub: (hub: DemandHub) => void;
  onDeleteDemandHub: (hubId: string) => void;
  onEditLogisticsHub: (hub: LogisticsHub) => void;
  onDeleteLogisticsHub: (hubId: string) => void;
  onEditRoute: (route: RouteType) => void;
  onDeleteRoute: (routeId: string) => void;
  onEditRisk: (risk: RiskEvent) => void;
  onDeactivateRisk: (risk: RiskEvent) => void;
  onDeleteRisk: (riskId: string) => void;
}) {
  const selected = getSelectedRecord(scenario, selectedItem);
  const activeRiskCount = scenario.riskEvents.filter((risk) => risk.active).length;

  return (
    <aside className="panel animate-panel-in h-full overflow-hidden p-2.5">
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-white">Network Control</h2>
        <p className="text-xs text-slate-500">Actions, layers, selected context</p>
      </div>

      <div className="grid max-h-[calc(100vh-11.5rem)] gap-2.5 overflow-auto pr-1">
        <Section title="Network Actions" icon={RadioTower}>
          <div className="grid grid-cols-2 gap-2">
            <ActionButton label="Add Supplier" icon={Boxes} tone="primary" onClick={() => onModeChange("supplier")} />
            <ActionButton label="Add Demand Hub" icon={MapPinned} tone="primary" onClick={() => onModeChange("demand")} />
            <ActionButton label="Add Port" icon={MapPinned} tone="secondary" onClick={() => onModeChange("logistics")} />
            <ActionButton label="Add Risk" icon={AlertTriangle} tone="secondary" onClick={() => onModeChange("risk")} />
          </div>
          <button className="btn mt-2 w-full disabled:cursor-not-allowed disabled:opacity-45" type="button" onClick={onCreateRoute} disabled={Boolean(routeDisabledReason)} title={routeDisabledReason || "Create route"}>
            <Route size={15} />
            Create Route
          </button>
          {routeDisabledReason && <p className="mt-2 text-xs leading-5 text-slate-500">{routeDisabledReason}</p>}
        </Section>

        <Section title="Layer Controls" icon={Layers}>
          <div className="grid gap-1.5">
            {(Object.keys(layers) as MapLayerKey[]).map((key) => (
              <label key={key} className="flex items-center justify-between rounded-md border border-slate-500/15 bg-ink-950/45 px-2 py-1.5 text-xs text-slate-300">
                <span>{layerLabel(key)}</span>
                <input type="checkbox" checked={layers[key]} onChange={() => onLayerChange({ ...layers, [key]: !layers[key] })} />
              </label>
            ))}
          </div>
        </Section>

        <Section title="Selected Item Details" icon={CircleDollarSign}>
          {selected ? (
            <SelectedDetails
              selected={selected}
              scenario={scenario}
              prediction={prediction}
              onEditSupplier={onEditSupplier}
              onDeleteSupplier={onDeleteSupplier}
              onEditDemandHub={onEditDemandHub}
              onDeleteDemandHub={onDeleteDemandHub}
              onEditLogisticsHub={onEditLogisticsHub}
              onDeleteLogisticsHub={onDeleteLogisticsHub}
              onEditRoute={onEditRoute}
              onDeleteRoute={onDeleteRoute}
              onEditRisk={onEditRisk}
              onCreateRoute={onCreateRoute}
              onDeactivateRisk={onDeactivateRisk}
              onDeleteRisk={onDeleteRisk}
            />
          ) : (
            <div className="rounded-md border border-slate-500/15 bg-ink-950/40 p-3 text-xs leading-5 text-slate-400">
              Select a supplier, demand hub, route, port, or risk marker to review its sourcing context and available actions.
            </div>
          )}
        </Section>

        <Section title="Decision Context" icon={Sparkles}>
          <div className="grid gap-1.5 text-xs leading-5 text-slate-400">
            <ContextRow label="Active Risks" value={String(activeRiskCount)} tone={activeRiskCount ? "risk" : "good"} />
            <ContextRow label="Recommendation" value={recommendation.finalDecision.toUpperCase()} tone={recommendation.finalDecision === "approve" ? "good" : recommendation.finalDecision === "revise" ? "warn" : "risk"} />
            <ContextRow label="Missing Fields" value={String(prediction.missingDataFields.length)} tone={prediction.missingDataFields.length ? "warn" : "good"} />
          </div>
        </Section>
      </div>
    </aside>
  );
}

function BottomDecisionStrip({
  prediction,
  recommendation,
  generatedAt,
  onGenerate,
  onApply,
}: {
  prediction: PredictionResult;
  recommendation: Recommendation;
  generatedAt: string;
  onGenerate: () => void;
  onApply: () => void;
}) {
  const biggestRisk = recommendation.biggestRisk || "Network incomplete";
  return (
    <section className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3 animate-panel-in">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <StripPill label="Warnings" value={String(prediction.warnings.length)} tone={prediction.warnings.length ? "risk" : "good"} />
        <StripPill label="Data Completeness" value={pct(prediction.confidenceScore)} tone={prediction.confidenceScore >= 60 ? "good" : "risk"} />
        <StripPill label="Biggest Risk" value={biggestRisk} tone="risk" />
        <StripPill label="Best Action" value={recommendation.bestLever} tone="cyan" />
        <span className="text-cyan-100/42">Updated {generatedAt}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn" type="button" onClick={onGenerate} data-testid="command-generate-recommendation">
          <Wand2 size={16} />
          Generate Recommendation
        </button>
        <button className="btn btn-primary" type="button" onClick={onApply} data-testid="command-apply-plan">
          <Send size={16} />
          Apply Plan
        </button>
      </div>
    </section>
  );
}

function getSelectedRecord(scenario: Scenario, selectedItem: SelectedMapItem | null) {
  if (!selectedItem) return null;
  if (selectedItem.type === "supplier") return { type: selectedItem.type, value: scenario.suppliers.find((item) => item.id === selectedItem.id) };
  if (selectedItem.type === "demandHub") return { type: selectedItem.type, value: scenario.demandHubs.find((item) => item.id === selectedItem.id) };
  if (selectedItem.type === "logisticsHub") return { type: selectedItem.type, value: scenario.logisticsHubs.find((item) => item.id === selectedItem.id) };
  if (selectedItem.type === "route") return { type: selectedItem.type, value: scenario.routes.find((item) => item.id === selectedItem.id) };
  return { type: selectedItem.type, value: scenario.riskEvents.find((item) => item.id === selectedItem.id) };
}

function SelectedDetails({
  selected,
  scenario,
  prediction,
  onEditSupplier,
  onDeleteSupplier,
  onEditDemandHub,
  onDeleteDemandHub,
  onEditLogisticsHub,
  onDeleteLogisticsHub,
  onEditRoute,
  onDeleteRoute,
  onEditRisk,
  onCreateRoute,
  onDeactivateRisk,
  onDeleteRisk,
}: {
  selected: NonNullable<ReturnType<typeof getSelectedRecord>>;
  scenario: Scenario;
  prediction: PredictionResult;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplierId: string) => void;
  onEditDemandHub: (hub: DemandHub) => void;
  onDeleteDemandHub: (hubId: string) => void;
  onEditLogisticsHub: (hub: LogisticsHub) => void;
  onDeleteLogisticsHub: (hubId: string) => void;
  onEditRoute: (route: RouteType) => void;
  onDeleteRoute: (routeId: string) => void;
  onEditRisk: (risk: RiskEvent) => void;
  onCreateRoute: () => void;
  onDeactivateRisk: (risk: RiskEvent) => void;
  onDeleteRisk: (riskId: string) => void;
}) {
  if (!selected.value) return <EmptyState title="Selected item no longer exists." body="Choose another map item or add a new record." />;
  if (selected.type === "supplier") {
    const supplier = selected.value as Supplier;
    const supplierPrediction = prediction.suppliers.find((item) => item.supplierId === supplier.id);
    const connectedRoutes = scenario.routes.filter((route) => route.supplierId === supplier.id);
    return (
      <DetailCard title={supplier.name || "Unnamed supplier"} subtitle={`${supplier.country || "Country not set"} / ${supplier.region || "Region not set"}`} onEdit={() => onEditSupplier(supplier)} onDelete={() => onDeleteSupplier(supplier.id)} secondaryLabel="Create Route" onSecondary={onCreateRoute}>
        <DetailRow label="Cost" value={supplier.baseUnitCost > 0 ? currency(supplier.baseUnitCost) : "Missing"} />
        <DetailRow label="Lead Time" value={supplier.leadTime ? `${supplier.leadTime} days` : "Missing"} />
        <DetailRow label="Capacity" value={supplier.capacity ? `${supplier.capacity.toLocaleString()} units` : "Missing"} />
        <DetailRow label="Reliability" value={supplier.reliability ? pct(supplier.reliability) : "Missing"} />
        <DetailRow label="ESG" value={supplier.esgScore ? supplier.esgScore.toFixed(0) : "Missing"} />
        <DetailRow label="Risk Score" value={supplierPrediction ? supplierPrediction.riskScore.toFixed(1) : "Pending"} />
        <DetailRow label="Connected Routes" value={connectedRoutes.length ? connectedRoutes.map((route) => route.destinationLabel || "Demand hub").join(", ") : "None"} />
      </DetailCard>
    );
  }
  if (selected.type === "demandHub") {
    const hub = selected.value as DemandHub;
    const connectedRoutes = scenario.routes.filter((route) => route.demandHubId === hub.id);
    const connectedSuppliers = Array.from(new Set(connectedRoutes.map((route) => scenario.suppliers.find((supplier) => supplier.id === route.supplierId)?.name || "Supplier")));
    return (
      <DetailCard title={hub.name || "Unnamed demand hub"} subtitle={`${hub.country || "Country not set"} / ${hub.priorityLevel}`} onEdit={() => onEditDemandHub(hub)} onDelete={() => onDeleteDemandHub(hub.id)}>
        <DetailRow label="Monthly Demand" value={hub.monthlyDemand ? `${hub.monthlyDemand.toLocaleString()} units` : "Missing"} />
        <DetailRow label="Inventory" value={hub.currentInventory ? `${hub.currentInventory.toLocaleString()} units` : "Missing"} />
        <DetailRow label="Service Target" value={hub.serviceLevelTarget ? pct(hub.serviceLevelTarget) : "Missing"} />
        <DetailRow label="Max Lead Time" value={hub.maxLeadTime ? `${hub.maxLeadTime} days` : "Missing"} />
        <DetailRow label="Connected Suppliers" value={connectedSuppliers.length ? connectedSuppliers.join(", ") : "None"} />
        <DetailRow label="Connected Routes" value={String(connectedRoutes.length)} />
      </DetailCard>
    );
  }
  if (selected.type === "logisticsHub") {
    const hub = selected.value as LogisticsHub;
    return (
      <DetailCard title={hub.name || "Unnamed logistics hub"} subtitle={`${hub.type} / ${hub.country || "Country not set"}`} onEdit={() => onEditLogisticsHub(hub)} onDelete={() => onDeleteLogisticsHub(hub.id)}>
        <DetailRow label="Customs Risk" value={hub.customsRisk ? hub.customsRisk.toFixed(0) : "Missing"} />
        <DetailRow label="Congestion" value={hub.congestionRisk ? hub.congestionRisk.toFixed(0) : "Missing"} />
        <DetailRow label="Handling Cost" value={hub.handlingCost ? currency(hub.handlingCost) : "Missing"} />
        <DetailRow label="Dwell Time" value={hub.dwellTimeDays ? `${hub.dwellTimeDays} days` : "Missing"} />
        <DetailRow label="Linked Routes" value={String(scenario.routes.filter((route) => route.logisticsHubId === hub.id).length)} />
      </DetailCard>
    );
  }
  if (selected.type === "route") {
    const route = selected.value as RouteType;
    const supplier = scenario.suppliers.find((item) => item.id === route.supplierId);
    const demandHub = scenario.demandHubs.find((item) => item.id === route.demandHubId);
    const landedCost = supplier ? supplier.baseUnitCost + route.freightCost + supplier.baseUnitCost * ((supplier.tariffRate + supplier.insuranceRate) / 100) : 0;
    const leadTime = supplier ? supplier.leadTime + route.transitTime : route.transitTime;
    return (
      <DetailCard title={`${route.originLabel || "Origin"} -> ${route.destinationLabel || "Destination"}`} subtitle={`${route.mode} lane`} onEdit={() => onEditRoute(route)} onDelete={() => onDeleteRoute(route.id)}>
        <DetailRow label="Supplier" value={supplier?.name || "Missing"} />
        <DetailRow label="Demand Hub" value={demandHub?.name || "Missing"} />
        <DetailRow label="Mode" value={route.mode} />
        <DetailRow label="Freight Cost" value={route.freightCost ? currency(route.freightCost) : "Missing"} />
        <DetailRow label="Transit Time" value={route.transitTime ? `${route.transitTime} days` : "Missing"} />
        <DetailRow label="Delay Probability" value={route.delayProbability ? pct(route.delayProbability) : "Missing"} />
        <DetailRow label="Customs Risk" value={route.customsRisk ? route.customsRisk.toFixed(0) : "Missing"} />
        <DetailRow label="Landed Cost" value={landedCost ? currency(landedCost) : "Pending"} />
        <DetailRow label="Lead Time" value={leadTime ? `${leadTime.toFixed(1)} days` : "Pending"} />
      </DetailCard>
    );
  }
  const risk = selected.value as RiskEvent;
  const affectedRoutes = scenario.routes.filter(
    (route) =>
      risk.affectedSupplierIds.includes(route.supplierId) ||
      risk.affectedDemandHubIds.includes(route.demandHubId) ||
      risk.affectedModes.includes(route.mode) ||
      scenario.suppliers.some((supplier) => supplier.id === route.supplierId && risk.affectedCountries.includes(supplier.country)),
  );
  const affectedSuppliers = scenario.suppliers.filter((supplier) => risk.affectedSupplierIds.includes(supplier.id) || risk.affectedCountries.includes(supplier.country));
  return (
    <DetailCard title={risk.name || "Unnamed risk event"} subtitle={`${risk.probability} probability / ${risk.durationDays} days`} onEdit={() => onEditRisk(risk)} onDelete={() => onDeleteRisk(risk.id)} secondaryLabel={risk.active ? "Deactivate" : undefined} onSecondary={risk.active ? () => onDeactivateRisk(risk) : undefined}>
      <DetailRow label="Probability" value={risk.probability} />
      <DetailRow label="Severity" value={risk.severity ? risk.severity.toFixed(0) : "Missing"} />
      <DetailRow label="Affected Lanes" value={String(affectedRoutes.length)} />
      <DetailRow label="Affected Suppliers" value={affectedSuppliers.length ? affectedSuppliers.map((supplier) => supplier.name || supplier.country).join(", ") : "None"} />
      <DetailRow label="Cost Impact" value={risk.costImpactPct ? `+${risk.costImpactPct}%` : "None"} />
      <DetailRow label="Freight Impact" value={risk.freightImpactPct ? `+${risk.freightImpactPct}%` : "None"} />
      <DetailRow label="Lead-Time Impact" value={risk.leadTimeImpactDays ? `+${risk.leadTimeImpactDays} days` : "None"} />
      <DetailRow label="Reliability Impact" value={risk.reliabilityImpactPct ? `-${risk.reliabilityImpactPct}%` : "None"} />
      <DetailRow label="Active" value={risk.active ? "Yes" : "No"} />
      <div className="mt-2 rounded-md border border-amber-300/20 bg-amber-300/10 p-2">
        <p className="text-xs font-semibold text-amber-100">Mitigation Suggestions</p>
        <ul className="mt-1 grid gap-1 text-xs leading-5 text-amber-50/80">
          {riskMitigations(risk).map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </DetailCard>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-500/15 bg-slate-300/[0.035] p-2.5">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        <Icon size={14} className="text-slate-500" />
        {title}
      </div>
      {children}
    </section>
  );
}

function ActionButton({ label, icon: Icon, tone, onClick }: { label: string; icon: LucideIcon; tone: "primary" | "secondary"; onClick: () => void }) {
  return (
    <button className={`btn justify-start px-2 text-xs ${tone === "primary" ? "btn-primary" : ""}`} type="button" onClick={onClick}>
      <Icon size={15} />
      {label}
    </button>
  );
}

function DetailCard({
  title,
  subtitle,
  onEdit,
  onDelete,
  secondaryLabel,
  onSecondary,
  children,
}: {
  title: string;
  subtitle: string;
  onEdit: () => void;
  onDelete?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  children: ReactNode;
}) {
  return (
    <article className="rounded-lg border border-cyanline/20 bg-cyanline/[0.045] p-3">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
      <div className="mt-3 grid gap-2">{children}</div>
      <div className="mt-3 grid gap-2">
        {secondaryLabel && onSecondary && (
          <button className="btn min-h-8 w-full px-2.5 py-1.5 text-xs" type="button" onClick={onSecondary}>
            {secondaryLabel}
          </button>
        )}
        <button className="btn btn-primary min-h-8 w-full px-2.5 py-1.5 text-xs" type="button" onClick={onEdit}>
          Edit Record
        </button>
        {onDelete && (
          <button className="btn btn-danger min-h-8 w-full px-2.5 py-1.5 text-xs" type="button" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border border-slate-500/15 bg-ink-950/45 px-2 py-1.5 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="break-words font-semibold text-slate-100">{value}</span>
    </div>
  );
}

function StripPill({ label, value, tone }: { label: string; value: string; tone: "risk" | "good" | "cyan" }) {
  const toneClass = tone === "risk" ? "border-risk/25 bg-risk/10 text-orange-100" : tone === "good" ? "border-good/25 bg-good/10 text-green-100" : "border-cyanline/25 bg-cyanline/10 text-cyan-100";
  return (
    <span className={`rounded-md border px-2 py-1 ${toneClass}`}>
      <span className="text-current/60">{label}: </span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function ContextRow({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "risk" }) {
  const toneClass = tone === "good" ? "text-green-100" : tone === "warn" ? "text-amber-100" : "text-orange-100";
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-slate-500/15 bg-ink-950/45 px-2 py-1.5">
      <span>{label}</span>
      <span className={`font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

function metricTone(tone: string) {
  const tones: Record<string, { icon: string; chip: string }> = {
    good: {
      icon: "border-good/25 bg-good/10 text-green-100",
      chip: "border-good/25 bg-good/10 text-green-100",
    },
    warn: {
      icon: "border-amber-300/25 bg-amber-300/10 text-amber-100",
      chip: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    },
    risk: {
      icon: "border-risk/25 bg-risk/10 text-orange-100",
      chip: "border-risk/25 bg-risk/10 text-orange-100",
    },
    muted: {
      icon: "border-slate-500/20 bg-slate-400/[0.06] text-slate-400",
      chip: "border-slate-500/20 bg-slate-400/[0.06] text-slate-400",
    },
  };
  return tones[tone] ?? tones.muted;
}

function riskMitigations(risk: RiskEvent) {
  if (risk.name.toLowerCase().includes("congestion") || risk.description.toLowerCase().includes("port")) {
    return ["Review alternate port routing.", "Reserve priority carrier capacity.", "Raise short-term safety stock."];
  }
  if (risk.affectedModes.includes("Air")) return ["Confirm expedite capacity.", "Set approval threshold for premium freight.", "Track service recovery window."];
  if (risk.costImpactPct || risk.freightImpactPct) return ["Model cost pass-through exposure.", "Refresh supplier and carrier quotes.", "Review contract flexibility."];
  return ["Confirm affected suppliers and lanes.", "Assign monitoring owner.", "Prepare backup sourcing option."];
}

function layerLabel(key: MapLayerKey) {
  const labels: Record<MapLayerKey, string> = {
    suppliers: "Suppliers",
    demandHubs: "Demand Hubs",
    logisticsHubs: "Ports and Logistics Hubs",
    routes: "Routes",
    riskEvents: "Risk Events",
    demandHeatmap: "Demand Heatmap",
    riskHeatmap: "Risk Heatmap",
  };
  return labels[key];
}
