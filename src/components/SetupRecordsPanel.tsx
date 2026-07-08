import { Building2, Globe2, Handshake, MapPinned, Plus, Route, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DemandHub, LogisticsHub, NegotiationLever, RegionalRiskProfile, Route as RouteType, Scenario } from "../logic/types";
import EmptyState from "./EmptyState";

interface SetupRecordsPanelProps {
  scenario: Scenario;
  onAddDemandHub: () => void;
  onEditDemandHub: (hub: DemandHub) => void;
  onAddRoute: () => void;
  routeDisabledReason?: string;
  onEditRoute: (route: RouteType) => void;
  onAddLogisticsHub: () => void;
  onEditLogisticsHub: (hub: LogisticsHub) => void;
  onAddLever: () => void;
  onEditLever: (lever: NegotiationLever) => void;
  onAddRiskProfile: () => void;
  onEditRiskProfile: (profile: RegionalRiskProfile) => void;
  onEditForecast: () => void;
}

export default function SetupRecordsPanel({
  scenario,
  onAddDemandHub,
  onEditDemandHub,
  onAddRoute,
  routeDisabledReason,
  onEditRoute,
  onAddLogisticsHub,
  onEditLogisticsHub,
  onAddLever,
  onEditLever,
  onAddRiskProfile,
  onEditRiskProfile,
  onEditForecast,
}: SetupRecordsPanelProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      <RecordPanel
        title="Demand Hubs"
        subtitle="Customer, plant, warehouse, or market demand locations"
        icon={MapPinned}
        emptyTitle="No customer demand locations added yet."
        emptyBody="Add demand hubs to show where your product needs to be delivered."
        actionLabel="Add Demand Hub"
        onAdd={onAddDemandHub}
        items={scenario.demandHubs.map((hub) => ({
          id: hub.id,
          title: hub.name,
          meta: `${hub.country || "Country not set"} · ${hub.monthlyDemand.toLocaleString()} units/month`,
          onEdit: () => onEditDemandHub(hub),
        }))}
      />
      <RecordPanel
        title="Routes & Lanes"
        subtitle="Supplier-to-Demand Connections with Transport Assumptions"
        icon={Route}
        emptyTitle="No supplier-to-demand lanes created yet."
        emptyBody="Connect suppliers to demand hubs to calculate route cost, lead time, and risk."
        actionLabel="Create Route"
        onAdd={onAddRoute}
        actionDisabledReason={routeDisabledReason}
        items={scenario.routes.map((route) => ({
          id: route.id,
          title: `${route.originLabel || "Origin"} to ${route.destinationLabel || "Destination"}`,
          meta: `${route.mode} · ${route.allocationPct}% allocation · ${route.active ? "Active" : "Inactive"}`,
          onEdit: () => onEditRoute(route),
        }))}
      />
      <RecordPanel
        title="Ports & Logistics Hubs"
        subtitle="Ports, airports, rail terminals, DCs, and cross-docks"
        icon={Building2}
        emptyTitle="No ports or logistics hubs added yet."
        emptyBody="Add logistics nodes to model congestion, customs, handling cost, and route dwell time."
        actionLabel="Add Logistics Hub"
        onAdd={onAddLogisticsHub}
        items={scenario.logisticsHubs.map((hub) => ({
          id: hub.id,
          title: hub.name,
          meta: `${hub.type} · ${hub.country || "Country not set"} · congestion ${hub.congestionRisk}`,
          onEdit: () => onEditLogisticsHub(hub),
        }))}
      />
      <RecordPanel
        title="Negotiation Levers"
        subtitle="Commercial Levers Created Manually by the User"
        icon={Handshake}
        emptyTitle="No negotiation levers added yet."
        emptyBody="Add price concessions, dual sourcing, expedited shipping, buffer inventory, or custom contract levers."
        actionLabel="Add Lever"
        onAdd={onAddLever}
        items={scenario.levers.map((lever) => ({
          id: lever.id,
          title: lever.name || "Unnamed lever",
          meta: `${lever.active ? "Applied" : "Available"} · cost ${lever.unitCostImpactPct}% · lead ${lever.leadTimeImpactPct}%`,
          onEdit: () => onEditLever(lever),
        }))}
      />
      <RecordPanel
        title="Country & Regional Risk"
        subtitle="Manual Risk Profiles by Country or Sourcing Region"
        icon={Globe2}
        emptyTitle="No country or regional risk profiles added yet."
        emptyBody="Add political, currency, disaster, labor, regulatory, and infrastructure risk scores."
        actionLabel="Add Risk Profile"
        onAdd={onAddRiskProfile}
        items={scenario.regionalRiskProfiles.map((profile) => ({
          id: profile.id,
          title: `${profile.country || "Country"} / ${profile.region || "Region"}`,
          meta: `Political ${profile.politicalRisk} · Currency ${profile.currencyRisk} · Disaster ${profile.naturalDisasterRisk}`,
          onEdit: () => onEditRiskProfile(profile),
        }))}
      />
      <section className="panel-soft p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Forecast Assumptions</h3>
            <p className="text-xs text-cyan-100/50">Demand Growth, Inflation, Risk Trend, and Service Drift</p>
          </div>
          <SlidersHorizontal size={18} className="text-cyanline" />
        </div>
        <div className="grid gap-2 rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3 text-xs text-cyan-100/65">
          <span>Demand Growth: {scenario.forecastAssumptions.demandGrowthPct}%</span>
          <span>Cost Inflation: {scenario.forecastAssumptions.costInflationPct}%</span>
          <span>Risk Trend: {scenario.forecastAssumptions.riskTrendPct}%</span>
          <button className="btn btn-primary mt-2" type="button" onClick={onEditForecast}>Edit Forecast Assumptions</button>
        </div>
      </section>
    </section>
  );
}

function RecordPanel({
  title,
  subtitle,
  icon: Icon,
  emptyTitle,
  emptyBody,
  actionLabel,
  onAdd,
  actionDisabledReason,
  items,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyBody: string;
  actionLabel: string;
  onAdd: () => void;
  actionDisabledReason?: string;
  items: Array<{ id: string; title: string; meta: string; onEdit: () => void }>;
}) {
  return (
    <section className="panel-soft p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs text-cyan-100/50">{subtitle}</p>
        </div>
        <button className="btn btn-primary px-2 disabled:cursor-not-allowed disabled:opacity-45" type="button" onClick={onAdd} title={actionDisabledReason || actionLabel} disabled={Boolean(actionDisabledReason)}>
          <Plus size={16} />
        </button>
      </div>
      {!items.length ? (
        <EmptyState title={emptyTitle} body={emptyBody} actionLabel={actionLabel} onAction={onAdd} actionDisabledReason={actionDisabledReason} />
      ) : (
        <div className="grid max-h-72 gap-2 overflow-auto pr-1">
          {items.map((item) => (
            <button
              key={item.id}
              className="rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3 text-left transition hover:border-cyanline/40 hover:bg-cyanline/10"
              type="button"
              onClick={item.onEdit}
            >
              <div className="flex items-center gap-2">
                <Icon size={15} className="text-cyanline" />
                <span className="truncate text-sm font-semibold text-white">{item.title}</span>
              </div>
              <p className="mt-1 text-xs text-cyan-100/55">{item.meta}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
