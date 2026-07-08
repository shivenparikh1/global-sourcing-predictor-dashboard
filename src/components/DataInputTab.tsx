import { Copy, Download, Edit3, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { DemandHub, LogisticsHub, NegotiationLever, RegionalRiskProfile, RiskEvent, Route, Scenario, Supplier } from "../logic/types";
import BudgetCapacityPanel from "./BudgetCapacityPanel";
import EmptyState from "./EmptyState";
import NumberInput from "./NumberInput";

type DataSection =
  | "suppliers"
  | "demand"
  | "routes"
  | "logistics"
  | "risks"
  | "budget"
  | "forecast"
  | "levers"
  | "regionalRisk"
  | "assumptions";

interface DataInputTabProps {
  scenario: Scenario;
  routeDisabledReason?: string;
  onUpdateScenario: (scenario: Scenario) => void;
  onAddSupplier: () => void;
  onEditSupplier: (supplier: Supplier) => void;
  onAddDemandHub: () => void;
  onEditDemandHub: (hub: DemandHub) => void;
  onAddRoute: () => void;
  onEditRoute: (route: Route) => void;
  onAddLogisticsHub: () => void;
  onEditLogisticsHub: (hub: LogisticsHub) => void;
  onAddRisk: () => void;
  onEditRisk: (risk: RiskEvent) => void;
  onAddLever: () => void;
  onEditLever: (lever: NegotiationLever) => void;
  onAddRiskProfile: () => void;
  onEditRiskProfile: (profile: RegionalRiskProfile) => void;
  onEditForecast: () => void;
}

const sections: Array<{ id: DataSection; label: string }> = [
  { id: "suppliers", label: "Suppliers" },
  { id: "demand", label: "Demand Hubs" },
  { id: "routes", label: "Routes and Lanes" },
  { id: "logistics", label: "Ports and Logistics" },
  { id: "risks", label: "Risk Events" },
  { id: "budget", label: "Budget & Constraints" },
  { id: "forecast", label: "Forecast Assumptions" },
  { id: "levers", label: "Negotiation Levers" },
  { id: "regionalRisk", label: "Country Risk Profiles" },
  { id: "assumptions", label: "Assumptions" },
];

export default function DataInputTab({
  scenario,
  routeDisabledReason,
  onUpdateScenario,
  onAddSupplier,
  onEditSupplier,
  onAddDemandHub,
  onEditDemandHub,
  onAddRoute,
  onEditRoute,
  onAddLogisticsHub,
  onEditLogisticsHub,
  onAddRisk,
  onEditRisk,
  onAddLever,
  onEditLever,
  onAddRiskProfile,
  onEditRiskProfile,
  onEditForecast,
}: DataInputTabProps) {
  const [activeSection, setActiveSection] = useState<DataSection>("suppliers");
  const [query, setQuery] = useState("");

  const search = query.trim().toLowerCase();
  const filterRows = <T,>(rows: T[], projector: (row: T) => string) => (search ? rows.filter((row) => projector(row).toLowerCase().includes(search)) : rows);

  const duplicateSupplier = (supplier: Supplier) => onUpdateScenario({ ...scenario, suppliers: [...scenario.suppliers, { ...supplier, id: `supplier-${Date.now()}`, name: `${supplier.name || "Unnamed supplier"} copy` }] });
  const duplicateDemand = (hub: DemandHub) => onUpdateScenario({ ...scenario, demandHubs: [...scenario.demandHubs, { ...hub, id: `demand-${Date.now()}`, name: `${hub.name || "Unnamed demand hub"} copy` }] });
  const duplicateRoute = (route: Route) => onUpdateScenario({ ...scenario, routes: [...scenario.routes, { ...route, id: `route-${Date.now()}` }] });
  const duplicateLogistics = (hub: LogisticsHub) => onUpdateScenario({ ...scenario, logisticsHubs: [...scenario.logisticsHubs, { ...hub, id: `logistics-${Date.now()}`, name: `${hub.name || "Unnamed hub"} copy` }] });
  const duplicateRisk = (risk: RiskEvent) => onUpdateScenario({ ...scenario, riskEvents: [...scenario.riskEvents, { ...risk, id: `risk-${Date.now()}`, name: `${risk.name || "Unnamed risk"} copy` }] });
  const duplicateProfile = (profile: RegionalRiskProfile) => onUpdateScenario({ ...scenario, regionalRiskProfiles: [...scenario.regionalRiskProfiles, { ...profile, id: `regional-risk-${Date.now()}` }] });

  const content = useMemo(() => {
    if (activeSection === "suppliers") {
      return (
        <EditableTable
          title="Suppliers"
          description="Commercial, risk, quality, ESG, and capacity records."
          rows={filterRows(scenario.suppliers, (row) => `${row.name} ${row.country} ${row.region} ${row.productCategory}`)}
          columns={["Name", "Country", "Category", "Cost", "Capacity", "Lead", "Reliability"]}
          emptyTitle="No suppliers added yet."
          emptyBody="Add your first supplier to begin evaluating landed cost, lead time, risk, quality, ESG, and capacity."
          onAdd={onAddSupplier}
          onClear={() => onUpdateScenario({ ...scenario, suppliers: [], routes: [], riskEvents: scenario.riskEvents.map((risk) => ({ ...risk, affectedSupplierIds: [] })) })}
          exportName="suppliers"
          renderRow={(supplier) => [supplier.name || "Unnamed supplier", supplier.country || "Country missing", supplier.productCategory || "Category missing", moneyOrMissing(supplier.baseUnitCost), numberOrMissing(supplier.capacity), daysOrMissing(supplier.leadTime), pctOrMissing(supplier.reliability)]}
          onEdit={onEditSupplier}
          onDuplicate={duplicateSupplier}
          onDelete={(supplier) => onUpdateScenario({ ...scenario, suppliers: scenario.suppliers.filter((item) => item.id !== supplier.id), routes: scenario.routes.filter((route) => route.supplierId !== supplier.id) })}
        />
      );
    }

    if (activeSection === "demand") {
      return (
        <EditableTable
          title="Demand Hubs"
          description="Customer, plant, warehouse, or market demand locations."
          rows={filterRows(scenario.demandHubs, (row) => `${row.name} ${row.country} ${row.region}`)}
          columns={["Name", "Country", "Monthly Demand", "Forecast", "Service", "Priority"]}
          emptyTitle="No customer demand locations added yet."
          emptyBody="Add demand hubs to show where your product needs to be delivered."
          onAdd={onAddDemandHub}
          onClear={() => onUpdateScenario({ ...scenario, demandHubs: [], routes: [], riskEvents: scenario.riskEvents.map((risk) => ({ ...risk, affectedDemandHubIds: [] })) })}
          exportName="demand-hubs"
          renderRow={(hub) => [hub.name || "Unnamed hub", hub.country || "Country missing", numberOrMissing(hub.monthlyDemand), numberOrMissing(hub.forecastDemand), pctOrMissing(hub.serviceLevelTarget), hub.priorityLevel]}
          onEdit={onEditDemandHub}
          onDuplicate={duplicateDemand}
          onDelete={(hub) => onUpdateScenario({ ...scenario, demandHubs: scenario.demandHubs.filter((item) => item.id !== hub.id), routes: scenario.routes.filter((route) => route.demandHubId !== hub.id) })}
        />
      );
    }

    if (activeSection === "routes") {
      return (
        <EditableTable
          title="Routes and Lanes"
          description="Supplier-to-demand transport lanes with cost, transit, customs, and emissions assumptions."
          rows={filterRows(scenario.routes, (row) => `${row.originLabel} ${row.destinationLabel} ${row.mode}`)}
          columns={["Origin", "Destination", "Mode", "Allocation", "Freight", "Transit", "Active"]}
          emptyTitle="No supplier-to-demand lanes created yet."
          emptyBody="Connect suppliers to demand hubs to calculate route cost, lead time, and risk."
          onAdd={onAddRoute}
          addDisabledReason={routeDisabledReason}
          onClear={() => onUpdateScenario({ ...scenario, routes: [] })}
          exportName="routes"
          renderRow={(route) => [route.originLabel || "Origin missing", route.destinationLabel || "Destination missing", route.mode, pctOrMissing(route.allocationPct), moneyOrMissing(route.freightCost), daysOrMissing(route.transitTime), route.active ? "Active" : "Inactive"]}
          onEdit={onEditRoute}
          onDuplicate={duplicateRoute}
          onDelete={(route) => onUpdateScenario({ ...scenario, routes: scenario.routes.filter((item) => item.id !== route.id) })}
        />
      );
    }

    if (activeSection === "logistics") {
      return (
        <EditableTable
          title="Ports and Logistics Hubs"
          description="Ports, airports, rail terminals, DCs, and cross-docks."
          rows={filterRows(scenario.logisticsHubs, (row) => `${row.name} ${row.country} ${row.region} ${row.type}`)}
          columns={["Name", "Country", "Type", "Customs", "Congestion", "Dwell"]}
          emptyTitle="No ports or logistics hubs added yet."
          emptyBody="Add logistics nodes to model congestion, customs, handling cost, and route dwell time."
          onAdd={onAddLogisticsHub}
          onClear={() => onUpdateScenario({ ...scenario, logisticsHubs: [], routes: scenario.routes.map((route) => ({ ...route, logisticsHubId: undefined, via: undefined })) })}
          exportName="logistics-hubs"
          renderRow={(hub) => [hub.name || "Unnamed hub", hub.country || "Country missing", hub.type, scoreOrMissing(hub.customsRisk), scoreOrMissing(hub.congestionRisk), daysOrMissing(hub.dwellTimeDays)]}
          onEdit={onEditLogisticsHub}
          onDuplicate={duplicateLogistics}
          onDelete={(hub) => onUpdateScenario({ ...scenario, logisticsHubs: scenario.logisticsHubs.filter((item) => item.id !== hub.id) })}
        />
      );
    }

    if (activeSection === "risks") {
      return (
        <EditableTable
          title="Risk Events"
          description="Manual or simulated events that stress-test the sourcing network."
          rows={filterRows(scenario.riskEvents, (row) => `${row.name} ${row.description} ${row.probability}`)}
          columns={["Name", "Probability", "Severity", "Lead Impact", "Cost Impact", "Active"]}
          emptyTitle="No active risk events added yet."
          emptyBody="Add geopolitical, weather, logistics, currency, or supplier risks to stress-test your sourcing network."
          onAdd={onAddRisk}
          onClear={() => onUpdateScenario({ ...scenario, riskEvents: [] })}
          exportName="risk-events"
          renderRow={(risk) => [risk.name || "Unnamed risk", risk.probability, scoreOrMissing(risk.severity), daysOrMissing(risk.leadTimeImpactDays), pctOrMissing(risk.costImpactPct + risk.freightImpactPct), risk.active ? "Active" : "Inactive"]}
          onEdit={onEditRisk}
          onDuplicate={duplicateRisk}
          onDelete={(risk) => onUpdateScenario({ ...scenario, riskEvents: scenario.riskEvents.filter((item) => item.id !== risk.id) })}
        />
      );
    }

    if (activeSection === "budget") return <BudgetCapacityPanel budget={scenario.budget} onChange={(budget) => onUpdateScenario({ ...scenario, budget })} />;

    if (activeSection === "forecast") {
      return (
        <section className="panel-soft p-4">
          <h3 className="text-sm font-semibold text-white">Forecast Assumptions</h3>
          <p className="mt-1 text-xs text-cyan-100/55">Demand Growth, Cost Inflation, Risk Trend, Service Drift, and Seasonality Notes.</p>
          <div className="mt-4 grid gap-2 text-sm text-cyan-100/70 sm:grid-cols-2 xl:grid-cols-4">
            <Assumption label="Demand Growth" value={`${scenario.forecastAssumptions.demandGrowthPct}%`} />
            <Assumption label="Cost Inflation" value={`${scenario.forecastAssumptions.costInflationPct}%`} />
            <Assumption label="Risk Trend" value={`${scenario.forecastAssumptions.riskTrendPct} pts`} />
            <Assumption label="Service Drift" value={`${scenario.forecastAssumptions.serviceDriftPct} pts`} />
          </div>
          <button className="btn btn-primary mt-4" type="button" onClick={onEditForecast}>Edit Forecast Assumptions</button>
        </section>
      );
    }

    if (activeSection === "levers") {
      return (
        <EditableTable
          title="Negotiation Levers"
          description="Commercial levers that adjust cost, service, risk, and resilience."
          rows={filterRows(scenario.levers, (row) => `${row.name} ${row.effect}`)}
          columns={["Name", "Effect", "Unit Cost", "Lead", "Service", "Active"]}
          emptyTitle="No negotiation levers added yet."
          emptyBody="Add price concessions, dual sourcing, expedited shipping, buffer inventory, supplier development, nearshoring, or contract flexibility levers."
          onAdd={onAddLever}
          onClear={() => onUpdateScenario({ ...scenario, levers: [] })}
          exportName="negotiation-levers"
          renderRow={(lever) => [lever.name || "Unnamed lever", lever.effect || "Effect missing", pctOrMissing(lever.unitCostImpactPct), pctOrMissing(lever.leadTimeImpactPct), `${lever.serviceLevelImpact} pts`, lever.active ? "Applied" : "Available"]}
          onEdit={onEditLever}
          onDuplicate={(lever) => onUpdateScenario({ ...scenario, levers: [...scenario.levers, { ...lever, id: `lever-${Date.now()}`, name: `${lever.name || "Unnamed lever"} copy` }] })}
          onDelete={(lever) => onUpdateScenario({ ...scenario, levers: scenario.levers.filter((item) => item.id !== lever.id) })}
        />
      );
    }

    if (activeSection === "regionalRisk") {
      return (
        <EditableTable
          title="Country and Regional Risk Profiles"
          description="Manual country and regional risk scores used by prediction and recommendations."
          rows={filterRows(scenario.regionalRiskProfiles, (row) => `${row.country} ${row.region}`)}
          columns={["Country", "Region", "Political", "Currency", "Disaster", "Infrastructure"]}
          emptyTitle="No country or regional risk profiles added yet."
          emptyBody="Add political, currency, disaster, labor, regulatory, and infrastructure risk scores."
          onAdd={onAddRiskProfile}
          onClear={() => onUpdateScenario({ ...scenario, regionalRiskProfiles: [] })}
          exportName="country-risk-profiles"
          renderRow={(profile) => [profile.country || "Country missing", profile.region || "Region missing", scoreOrMissing(profile.politicalRisk), scoreOrMissing(profile.currencyRisk), scoreOrMissing(profile.naturalDisasterRisk), scoreOrMissing(profile.infrastructureRisk)]}
          onEdit={onEditRiskProfile}
          onDuplicate={duplicateProfile}
          onDelete={(profile) => onUpdateScenario({ ...scenario, regionalRiskProfiles: scenario.regionalRiskProfiles.filter((item) => item.id !== profile.id) })}
        />
      );
    }

    return <AssumptionsPanel />;
  }, [activeSection, query, scenario, routeDisabledReason]);

  return (
    <section className="grid gap-4 animate-tab-in xl:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="panel p-3">
        <h2 className="text-sm font-semibold text-white">Data Input</h2>
        <p className="mt-1 text-xs leading-5 text-cyan-100/52">Manual records, bulk table editing, and visible assumptions.</p>
        <div className="mt-3 flex items-center gap-2 rounded-md border border-cyan-200/15 bg-ink-950/60 px-3 py-2">
          <Search size={15} className="text-cyanline" />
          <input className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none" placeholder="Search current section" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="mt-3 grid gap-1">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`rounded-md px-3 py-2 text-left text-sm transition ${activeSection === section.id ? "bg-cyanline/15 text-cyan-50 shadow-glow" : "text-cyan-100/62 hover:bg-white/[0.04] hover:text-white"}`}
              type="button"
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </div>
      </aside>
      <div className="min-w-0">{content}</div>
    </section>
  );
}

function EditableTable<T extends { id: string }>({
  title,
  description,
  rows,
  columns,
  emptyTitle,
  emptyBody,
  onAdd,
  addDisabledReason,
  onClear,
  exportName,
  renderRow,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  title: string;
  description: string;
  rows: T[];
  columns: string[];
  emptyTitle: string;
  emptyBody: string;
  onAdd: () => void;
  addDisabledReason?: string;
  onClear: () => void;
  exportName: string;
  renderRow: (row: T) => string[];
  onEdit: (row: T) => void;
  onDuplicate: (row: T) => void;
  onDelete: (row: T) => void;
}) {
  const exportCsv = () => {
    const csv = [columns.join(","), ...rows.map((row) => renderRow(row).map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${exportName}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="panel-soft overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cyan-200/10 p-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs text-cyan-100/52">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-45" type="button" onClick={onAdd} disabled={Boolean(addDisabledReason)} title={addDisabledReason || `Add ${title}`}>
            <Plus size={16} />
            Add row
          </button>
          <button className="btn" type="button" onClick={exportCsv}>
            <Download size={16} />
            CSV
          </button>
          <button className="btn btn-danger" type="button" onClick={onClear}>
            <Trash2 size={16} />
            Clear all
          </button>
        </div>
        {addDisabledReason && <p className="w-full text-xs text-cyan-100/48">{addDisabledReason}</p>}
      </div>
      {!rows.length ? (
        <div className="p-4">
          <EmptyState title={emptyTitle} body={emptyBody} actionLabel="Add row" onAction={onAdd} actionDisabledReason={addDisabledReason} />
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full min-w-[54rem] text-left text-sm">
            <thead className="bg-ink-950/60 text-[0.68rem] uppercase text-cyan-100/50">
              <tr>
                {columns.map((column) => <th key={column} className="px-3 py-2 font-semibold">{column}</th>)}
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-cyan-200/10 transition hover:bg-cyanline/[0.045]">
                  {renderRow(row).map((cell, index) => <td key={`${row.id}-${index}`} className="px-3 py-3 text-cyan-50/[0.82]">{cell}</td>)}
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button className="btn px-2" type="button" onClick={() => onEdit(row)} title="Edit row"><Edit3 size={14} /></button>
                      <button className="btn px-2" type="button" onClick={() => onDuplicate(row)} title="Duplicate row"><Copy size={14} /></button>
                      <button className="btn btn-danger px-2" type="button" onClick={() => onDelete(row)} title="Delete row"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AssumptionsPanel() {
  const [assumptions, setAssumptions] = useState({
    insuranceRateDefault: 1.5,
    carryingCostAnnual: 20,
    riskPremiumMultiplier: 0.5,
    seaEmissions: 0.08,
    airEmissions: 0.85,
    landEmissions: 0.24,
    defaultCustomsRisk: 15,
  });

  return (
    <section className="panel-soft p-4">
      <h3 className="text-sm font-semibold text-white">Visible Editable Assumptions</h3>
      <p className="mt-1 text-xs leading-5 text-cyan-100/55">These defaults are visible for planning. User-entered supplier, route, and risk data overrides them in the model.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(assumptions).map(([key, value]) => (
          <label key={key} className="grid gap-1 rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3">
            <span className="text-xs font-semibold text-cyan-100/75">{labelize(key)}</span>
            <NumberInput className="input" value={value} onChange={(nextValue) => setAssumptions({ ...assumptions, [key]: nextValue })} />
          </label>
        ))}
      </div>
    </section>
  );
}

function Assumption({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3">
      <p className="text-xs text-cyan-100/45">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

const moneyOrMissing = (value: number) => (value > 0 ? `$${value.toLocaleString()}` : "Missing");
const numberOrMissing = (value: number) => (value > 0 ? value.toLocaleString() : "Missing");
const daysOrMissing = (value: number) => (value > 0 ? `${value}d` : "Missing");
const pctOrMissing = (value: number) => (value !== 0 ? `${value}%` : "Missing");
const scoreOrMissing = (value: number) => (value > 0 ? value.toFixed(0) : "Missing");
const labelize = (value: string) => value.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
