import { Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { fieldHelp } from "../logic/descriptors";
import { countryOptions, getRegionForCountry, regionOptions } from "../logic/referenceData";
import { transportModes } from "../logic/seedData";
import {
  autofillDemandHubFromText,
  autofillForecastFromText,
  autofillLeverFromText,
  autofillLogisticsHubFromText,
  autofillRegionalRiskFromText,
  autofillRouteFromText,
} from "../logic/textAutofill";
import type { Coordinates, DemandHub, ForecastAssumptions, LogisticsHub, NegotiationLever, RegionalRiskProfile, Route, Scenario, TransportMode } from "../logic/types";
import FormField from "./FormField";
import NumberInput from "./NumberInput";
import SearchableSelect from "./SearchableSelect";
import SmartAutofillBox from "./SmartAutofillBox";

interface BaseModalProps<T> {
  value: T | null;
  isNew?: boolean;
  onClose: () => void;
  onSave: (value: T) => void;
  onDelete?: (id: string) => void;
}

const scoreHelp = fieldHelp.riskScore;
const simple = (label: string, helper: string, placeholder: string, validation: string, unit?: string) => ({ label, helper, placeholder, validation, unit });
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const displayLat = (coordinates: Coordinates) => coordinates.lat ?? Number((90 - coordinates.y * 2).toFixed(3));
const displayLng = (coordinates: Coordinates) => coordinates.lng ?? Number((coordinates.x * 3.6 - 180).toFixed(3));
const updateLat = (coordinates: Coordinates, lat: number): Coordinates => ({
  ...coordinates,
  lat,
  y: Number(clamp((90 - lat) / 2, 4, 86).toFixed(1)),
});
const updateLng = (coordinates: Coordinates, lng: number): Coordinates => ({
  ...coordinates,
  lng,
  x: Number(clamp((lng + 180) / 3.6, 3, 97).toFixed(1)),
});

export function DemandHubModal({ value, isNew, onClose, onSave, onDelete }: BaseModalProps<DemandHub>) {
  const [draft, setDraft] = useState<DemandHub | null>(value);
  const [step, setStep] = useState(0);
  useEffect(() => {
    setDraft(value);
    setStep(0);
  }, [value]);
  if (!draft) return null;

  return (
    <ModalShell title={isNew ? "Add Demand Hub" : "Demand Hub"} subtitle="Customer, region, plant, warehouse, or delivery market." onClose={onClose}>
      <SmartAutofillBox
        title="AI Autofill Demand Hub"
        placeholder="Example: Demand hub: Northeast Fulfillment Hub, United States. Monthly demand 12000 units, forecast 13200, service target 95%, max lead time 42 days, inventory 6800, safety stock 21 days, priority critical."
        onApply={(text) => setDraft(autofillDemandHubFromText(draft, text))}
      />
      <StepTabs steps={["Hub Profile", "Demand & Service", "Inventory & Coordinates"]} activeStep={step} onChange={setStep} />
      {step === 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          <FormField id="demand-name" label="Demand Hub" helper="A customer, market, plant, warehouse, or region that needs delivered supply." placeholder="Example: US East DC" validation="Demand hub name is required." value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
          <SearchableSelect label={fieldHelp.country.label} helper={fieldHelp.country.helper} value={draft.country} options={countryOptions} placeholder={fieldHelp.country.placeholder} onChange={(country) => setDraft({ ...draft, country, region: draft.region || getRegionForCountry(country) })} />
          <SearchableSelect label={fieldHelp.region.label} helper={fieldHelp.region.helper} value={draft.region} options={regionOptions} placeholder={fieldHelp.region.placeholder} onChange={(region) => setDraft({ ...draft, region })} />
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-cyan-100/75">Priority Level</span>
            <span className="text-[0.7rem] text-cyan-100/48">Business criticality for this demand location.</span>
            <select className="input" value={draft.priorityLevel} onChange={(event) => setDraft({ ...draft, priorityLevel: event.target.value as DemandHub["priorityLevel"] })}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </label>
          <FormField id="demand-notes" type="textarea" label="Notes" helper="Optional context about customers, market constraints, or service promises." placeholder="Example: Priority retail launch region" validation="Optional." value={draft.notes} onChange={(notes) => setDraft({ ...draft, notes })} />
        </div>
      )}
      {step === 1 && (
        <div className="grid gap-3 md:grid-cols-2">
          <FormField id="monthly-demand" type="number" min={0} {...fieldHelp.monthlyDemand} value={draft.monthlyDemand} onChange={(monthlyDemand) => setDraft({ ...draft, monthlyDemand: Number(monthlyDemand) })} />
          <FormField id="forecast-demand" type="number" min={0} {...simple("Forecast Demand", "Expected future demand for this hub during the scenario horizon.", "Example: 14000", "Forecast demand cannot be negative.", "units")} value={draft.forecastDemand} onChange={(forecastDemand) => setDraft({ ...draft, forecastDemand: Number(forecastDemand) })} />
          <FormField id="service-target" type="number" min={0} max={100} {...fieldHelp.serviceLevelTarget} value={draft.serviceLevelTarget} onChange={(serviceLevelTarget) => setDraft({ ...draft, serviceLevelTarget: Number(serviceLevelTarget) })} />
          <FormField id="max-lead" type="number" min={0} {...fieldHelp.maxLeadTime} value={draft.maxLeadTime} onChange={(maxLeadTime) => setDraft({ ...draft, maxLeadTime: Number(maxLeadTime) })} />
          <FormField id="required-date" type="date" label="Required Delivery Date" helper="Target date when this hub needs supply available." validation="Use a valid delivery date when date-sensitive." value={draft.requiredDeliveryDate} onChange={(requiredDeliveryDate) => setDraft({ ...draft, requiredDeliveryDate })} />
        </div>
      )}
      {step === 2 && (
        <div className="grid gap-3 md:grid-cols-2">
          <FormField id="current-inventory" type="number" min={0} {...simple("Current Inventory", "Units currently available to serve this demand hub.", "Example: 5000", "Current inventory cannot be negative.", "units")} value={draft.currentInventory} onChange={(currentInventory) => setDraft({ ...draft, currentInventory: Number(currentInventory) })} />
          <FormField id="safety-stock" type="number" min={0} {...simple("Safety Stock", "Inventory buffer held to absorb demand or supply variability.", "Example: 15", "Safety stock cannot be negative.", "days")} value={draft.safetyStock} onChange={(safetyStock) => setDraft({ ...draft, safetyStock: Number(safetyStock) })} />
          <CoordinateFields coordinates={draft.coordinates} onChange={(coordinates) => setDraft({ ...draft, coordinates })} />
        </div>
      )}
      <ModalActions isNew={isNew} id={draft.id} onDelete={onDelete} onClose={onClose} onSave={() => onSave(draft)} />
    </ModalShell>
  );
}

export function LogisticsHubModal({ value, isNew, onClose, onSave, onDelete }: BaseModalProps<LogisticsHub>) {
  const [draft, setDraft] = useState<LogisticsHub | null>(value);
  useEffect(() => setDraft(value), [value]);
  if (!draft) return null;

  return (
    <ModalShell title={isNew ? "Add Logistics Hub" : "Logistics Hub"} subtitle="Port, airport, rail terminal, DC, or cross-dock assumptions." onClose={onClose}>
      <SmartAutofillBox
        title="AI Autofill Logistics Hub"
        placeholder="Example: Port: Port of Rotterdam, Netherlands. Customs risk 12, congestion risk 22, handling cost $2.10, dwell time 3 days."
        onApply={(text) => setDraft(autofillLogisticsHubFromText(draft, text))}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <FormField id="logistics-name" label="Port or Logistics Hub" helper="A logistics node used by one or more supplier lanes." placeholder="Example: Port of Los Angeles" validation="Hub name is required." value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
        <SearchableSelect label={fieldHelp.country.label} helper={fieldHelp.country.helper} value={draft.country} options={countryOptions} placeholder={fieldHelp.country.placeholder} onChange={(country) => setDraft({ ...draft, country, region: draft.region || getRegionForCountry(country) })} />
        <SearchableSelect label={fieldHelp.region.label} helper={fieldHelp.region.helper} value={draft.region} options={regionOptions} placeholder={fieldHelp.region.placeholder} onChange={(region) => setDraft({ ...draft, region })} />
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-cyan-100/75">Hub Type</span>
          <span className="text-[0.7rem] text-cyan-100/48">The logistics function this node performs.</span>
          <select className="input" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as LogisticsHub["type"] })}>
            <option>Port</option>
            <option>Airport</option>
            <option>Rail terminal</option>
            <option>Distribution center</option>
            <option>Cross-dock</option>
          </select>
        </label>
        <FormField id="customs-risk" type="number" min={0} max={100} label="Customs Risk" helper="Chance of import/export clearance delay or compliance hold." placeholder="Example: 25" unit="0-100" validation="Customs risk must be between 0 and 100." value={draft.customsRisk} onChange={(customsRisk) => setDraft({ ...draft, customsRisk: Number(customsRisk) })} />
        <FormField id="congestion-risk" type="number" min={0} max={100} label="Port Congestion Risk" helper="Likelihood of queueing, dwell time, or throughput constraints." placeholder="Example: 45" unit="0-100" validation="Congestion risk must be between 0 and 100." value={draft.congestionRisk} onChange={(congestionRisk) => setDraft({ ...draft, congestionRisk: Number(congestionRisk) })} />
        <FormField id="handling-cost" type="number" min={0} label="Handling Cost" helper="Estimated per-unit handling or transfer cost at this hub." placeholder="Example: 2.5" unit="USD/unit" validation="Handling cost cannot be negative." value={draft.handlingCost} onChange={(handlingCost) => setDraft({ ...draft, handlingCost: Number(handlingCost) })} />
        <FormField id="dwell-time" type="number" min={0} label="Dwell Time" helper="Expected waiting or processing days at this hub." placeholder="Example: 3" unit="days" validation="Dwell time cannot be negative." value={draft.dwellTimeDays} onChange={(dwellTimeDays) => setDraft({ ...draft, dwellTimeDays: Number(dwellTimeDays) })} />
        <CoordinateFields coordinates={draft.coordinates} onChange={(coordinates) => setDraft({ ...draft, coordinates })} />
        <FormField id="logistics-notes" type="textarea" label="Notes" helper="Optional context about carrier, customs, or operational constraints." placeholder="Example: Seasonal congestion during Q4" validation="Optional." value={draft.notes} onChange={(notes) => setDraft({ ...draft, notes })} />
      </div>
      <ModalActions isNew={isNew} id={draft.id} onDelete={onDelete} onClose={onClose} onSave={() => onSave(draft)} />
    </ModalShell>
  );
}

export function RouteLaneModal({ value, scenario, isNew, onClose, onSave, onDelete }: BaseModalProps<Route> & { scenario: Scenario }) {
  const [draft, setDraft] = useState<Route | null>(value);
  const [step, setStep] = useState(0);
  useEffect(() => {
    setDraft(value);
    setStep(0);
  }, [value]);
  if (!draft) return null;

  const selectedSupplier = scenario.suppliers.find((supplier) => supplier.id === draft.supplierId);
  const selectedHub = scenario.demandHubs.find((hub) => hub.id === draft.demandHubId);

  return (
    <ModalShell title={isNew ? "Create Supplier-to-Demand Route" : "Route/Lane"} subtitle="Connect one supplier to one demand hub with lane assumptions." onClose={onClose}>
      <SmartAutofillBox
        title="AI Autofill Route"
        placeholder="Example: Route from Taiwan Precision Controls to Northeast Fulfillment Hub by sea. Allocation 45%, freight cost $5.80, transit time 27 days, delay probability 22%, customs risk 18, congestion risk 42, emissions 0.08."
        onApply={(text) => setDraft(autofillRouteFromText(draft, text, scenario))}
      />
      <StepTabs steps={["Lane Endpoints", "Cost & Transit", "Risk & Emissions"]} activeStep={step} onChange={setStep} />
      {step === 0 && (
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-cyan-100/75">Origin Supplier</span>
          <span className="text-[0.7rem] text-cyan-100/48">Supplier that ships product on this lane.</span>
          <select
            className="input"
            value={draft.supplierId}
            onChange={(event) => {
              const supplier = scenario.suppliers.find((item) => item.id === event.target.value);
              setDraft({ ...draft, supplierId: event.target.value, originLabel: supplier?.country ?? "", from: supplier?.coordinates ?? draft.from });
            }}
          >
            <option value="">Select supplier</option>
            {scenario.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-cyan-100/75">Destination Demand Hub</span>
          <span className="text-[0.7rem] text-cyan-100/48">Customer, plant, warehouse, or region served by this lane.</span>
          <select
            className="input"
            value={draft.demandHubId}
            onChange={(event) => {
              const hub = scenario.demandHubs.find((item) => item.id === event.target.value);
              setDraft({ ...draft, demandHubId: event.target.value, destinationLabel: hub?.name ?? "", to: hub?.coordinates ?? draft.to });
            }}
          >
            <option value="">Select demand hub</option>
            {scenario.demandHubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-cyan-100/75">Port or Logistics Hub</span>
          <span className="text-[0.7rem] text-cyan-100/48">Optional node used to model congestion or customs risk.</span>
          <select className="input" value={draft.logisticsHubId ?? ""} onChange={(event) => setDraft({ ...draft, logisticsHubId: event.target.value || undefined })}>
            <option value="">No logistics hub</option>
            {scenario.logisticsHubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-cyan-100/75">Transport Mode</span>
          <span className="text-[0.7rem] text-cyan-100/48">Sea, air, land, or multimodal freight method for this lane.</span>
          <select className="input" value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value as TransportMode })}>
            {transportModes.map((mode) => <option key={mode}>{mode}</option>)}
          </select>
        </label>
      </div>
      )}
      {step === 1 && (
      <div className="grid gap-3 md:grid-cols-2">
        <FormField id="route-allocation" type="number" min={0} max={100} label="Allocation Percentage" helper="Share of the selected demand hub served by this lane." placeholder="Example: 40" unit="%" validation="Route allocations should total 100% for each demand hub." value={draft.allocationPct} onChange={(allocationPct) => setDraft({ ...draft, allocationPct: Number(allocationPct) })} />
        <FormField id="route-freight" type="number" min={0} {...fieldHelp.freightCost} value={draft.freightCost} onChange={(freightCost) => setDraft({ ...draft, freightCost: Number(freightCost) })} />
        <FormField id="route-transit" type="number" min={0} {...fieldHelp.transitTime} value={draft.transitTime} onChange={(transitTime) => setDraft({ ...draft, transitTime: Number(transitTime) })} />
      </div>
      )}
      {step === 2 && (
      <div className="grid gap-3 md:grid-cols-2">
        <FormField id="route-delay" type="number" min={0} max={100} {...fieldHelp.delayProbability} value={draft.delayProbability} onChange={(delayProbability) => setDraft({ ...draft, delayProbability: Number(delayProbability) })} />
        <FormField id="route-customs" type="number" min={0} max={100} label="Customs Risk" helper="Chance of clearance delays or compliance holds on this route." placeholder="Example: 20" unit="0-100" validation="Customs risk must be between 0 and 100." value={draft.customsRisk} onChange={(customsRisk) => setDraft({ ...draft, customsRisk: Number(customsRisk) })} />
        <FormField id="route-congestion" type="number" min={0} max={100} label="Port Congestion Risk" helper="Likelihood of queueing, dwell time, or capacity constraints along this route." placeholder="Example: 35" unit="0-100" validation="Congestion risk must be between 0 and 100." value={draft.portCongestionRisk} onChange={(portCongestionRisk) => setDraft({ ...draft, portCongestionRisk: Number(portCongestionRisk) })} />
        <FormField id="route-emissions" type="number" min={0} label="Emissions Factor" helper="Estimated emissions per unit moved on this lane." placeholder="Example: 0.45" unit="kg/unit" validation="Emissions factor cannot be negative." value={draft.emissionsFactor} onChange={(emissionsFactor) => setDraft({ ...draft, emissionsFactor: Number(emissionsFactor) })} />
        <FormField id="route-distance" type="number" min={0} label="Distance Estimate" helper="Approximate route distance for context and emissions planning." placeholder="Example: 8400" unit="km" validation="Distance cannot be negative." value={draft.distanceEstimate} onChange={(distanceEstimate) => setDraft({ ...draft, distanceEstimate: Number(distanceEstimate) })} />
        <label className="flex items-center gap-2 pt-6 text-sm text-cyan-100/75">
          <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
          Active Route
        </label>
        <div className="rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3 text-xs text-cyan-100/60">
          <p className="font-semibold text-cyan-100/80">Validation</p>
          <p className="mt-1">Selected route: {selectedSupplier?.name || "supplier missing"} to {selectedHub?.name || "demand hub missing"}.</p>
        </div>
      </div>
      )}
      <ModalActions isNew={isNew} id={draft.id} onDelete={onDelete} onClose={onClose} onSave={() => onSave(draft)} />
    </ModalShell>
  );
}

export function NegotiationLeverModal({ value, isNew, onClose, onSave, onDelete }: BaseModalProps<NegotiationLever>) {
  const [draft, setDraft] = useState<NegotiationLever | null>(value);
  useEffect(() => setDraft(value), [value]);
  if (!draft) return null;

  return (
    <ModalShell title={isNew ? "Add Negotiation Lever" : "Negotiation Lever"} subtitle="Create commercial levers and model before/after impacts." onClose={onClose}>
      <SmartAutofillBox
        title="AI Autofill Negotiation Lever"
        placeholder="Example: Lever: Price concession. Effect: -3% unit cost with 1 point reliability impact. Unit cost impact -3%, resilience impact 2, management cost impact 0.5%."
        onApply={(text) => setDraft(autofillLeverFromText(draft, text))}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <FormField id="lever-name" label="Negotiation Lever" helper="A commercial or operational action that changes cost, service, risk, or resilience." placeholder="Example: Price concession" validation="Lever name is required." value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
        <FormField id="lever-effect" label="Effect Summary" helper="Plain-English description shown on lever cards." placeholder="Example: -3% unit cost, -2% reliability" validation="Describe the trade-off clearly." value={draft.effect} onChange={(effect) => setDraft({ ...draft, effect })} />
        <FormField id="lever-unit-cost" type="number" label="Unit Cost Impact" helper="Negative values reduce quoted supplier cost; positive values increase it." placeholder="Example: -3" unit="%" validation="Use negative for savings and positive for cost increases." value={draft.unitCostImpactPct} onChange={(unitCostImpactPct) => setDraft({ ...draft, unitCostImpactPct: Number(unitCostImpactPct) })} />
        <FormField id="lever-freight-cost" type="number" label="Freight Cost Impact" helper="Percentage impact to freight cost per unit." placeholder="Example: 12" unit="%" validation="Use a percentage value." value={draft.freightCostImpactPct} onChange={(freightCostImpactPct) => setDraft({ ...draft, freightCostImpactPct: Number(freightCostImpactPct) })} />
        <FormField id="lever-lead" type="number" label="Lead-Time Impact" helper="Percentage impact to predicted lead time. Negative values reduce lead time." placeholder="Example: -30" unit="%" validation="Use negative for faster lanes." value={draft.leadTimeImpactPct} onChange={(leadTimeImpactPct) => setDraft({ ...draft, leadTimeImpactPct: Number(leadTimeImpactPct) })} />
        <FormField id="lever-reliability" type="number" label="Reliability Impact" helper="Point impact to supplier reliability." placeholder="Example: 5" unit="pts" validation="Use positive or negative points." value={draft.reliabilityImpactPct} onChange={(reliabilityImpactPct) => setDraft({ ...draft, reliabilityImpactPct: Number(reliabilityImpactPct) })} />
        <FormField id="lever-resilience" type="number" label="Resilience Impact" helper="Point impact to network resilience." placeholder="Example: 15" unit="pts" validation="Use positive or negative points." value={draft.resilienceImpact} onChange={(resilienceImpact) => setDraft({ ...draft, resilienceImpact: Number(resilienceImpact) })} />
        <FormField id="lever-service" type="number" label="Service-Level Impact" helper="Point impact to service prediction." placeholder="Example: 12" unit="pts" validation="Use positive or negative points." value={draft.serviceLevelImpact} onChange={(serviceLevelImpact) => setDraft({ ...draft, serviceLevelImpact: Number(serviceLevelImpact) })} />
        <FormField id="lever-emissions" type="number" label="Emissions Impact" helper="Percentage impact to transport emissions." placeholder="Example: 10" unit="%" validation="Use a percentage value." value={draft.emissionsImpactPct} onChange={(emissionsImpactPct) => setDraft({ ...draft, emissionsImpactPct: Number(emissionsImpactPct) })} />
        <FormField id="lever-management" type="number" label="Management Cost Impact" helper="Additional management overhead as percentage of supplier unit cost." placeholder="Example: 4" unit="%" validation="Management cost cannot be negative unless intentionally modeled as savings." value={draft.managementCostImpactPct} onChange={(managementCostImpactPct) => setDraft({ ...draft, managementCostImpactPct: Number(managementCostImpactPct) })} />
        <label className="flex items-center gap-2 pt-6 text-sm text-cyan-100/75">
          <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
          Apply Lever
        </label>
      </div>
      <ModalActions isNew={isNew} id={draft.id} onDelete={onDelete} onClose={onClose} onSave={() => onSave(draft)} />
    </ModalShell>
  );
}

export function RegionalRiskProfileModal({ value, isNew, onClose, onSave, onDelete }: BaseModalProps<RegionalRiskProfile>) {
  const [draft, setDraft] = useState<RegionalRiskProfile | null>(value);
  useEffect(() => setDraft(value), [value]);
  if (!draft) return null;

  return (
    <ModalShell title={isNew ? "Add Country/Regional Risk Profile" : "Country/Regional Risk Profile"} subtitle="Manual country and regional risk assumptions." onClose={onClose}>
      <SmartAutofillBox
        title="AI Autofill Regional Risk"
        placeholder="Example: Country Taiwan, region East Asia. Political risk 44, currency risk 22, natural disaster risk 38, regulatory risk 20, labor risk 16, infrastructure risk 12."
        onApply={(text) => setDraft(autofillRegionalRiskFromText(draft, text))}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <SearchableSelect label={fieldHelp.country.label} helper={fieldHelp.country.helper} value={draft.country} options={countryOptions} placeholder={fieldHelp.country.placeholder} onChange={(country) => setDraft({ ...draft, country, region: draft.region || getRegionForCountry(country) })} />
        <SearchableSelect label={fieldHelp.region.label} helper={fieldHelp.region.helper} value={draft.region} options={regionOptions} placeholder={fieldHelp.region.placeholder} onChange={(region) => setDraft({ ...draft, region })} />
        {[
          ["politicalRisk", "Political Risk", "Country or regional instability that can affect sourcing continuity."],
          ["currencyRisk", "Currency Risk", "Exposure to exchange-rate volatility in supplier markets."],
          ["naturalDisasterRisk", "Natural Disaster Risk", "Weather, flood, seismic, storm, or climate exposure."],
          ["regulatoryRisk", "Regulatory Risk", "Compliance, licensing, or regulatory disruption exposure."],
          ["laborRisk", "Labor Risk", "Strike, labor availability, wage, or workforce disruption exposure."],
          ["infrastructureRisk", "Infrastructure Risk", "Power, road, port, utility, or logistics infrastructure exposure."],
        ].map(([key, label, helper]) => (
          <FormField key={key} id={`regional-${key}`} type="number" min={0} max={100} label={label} helper={helper} placeholder="Example: 45" unit="0-100" validation={`${label} must be between 0 and 100.`} value={draft[key as keyof RegionalRiskProfile] as number} onChange={(value) => setDraft({ ...draft, [key]: Number(value) })} />
        ))}
        <FormField id="regional-notes" type="textarea" label="Notes" helper="Optional explanation of assumptions or data source." placeholder="Example: Based on internal country risk review" validation="Optional." value={draft.notes} onChange={(notes) => setDraft({ ...draft, notes })} />
      </div>
      <ModalActions isNew={isNew} id={draft.id} onDelete={onDelete} onClose={onClose} onSave={() => onSave(draft)} />
    </ModalShell>
  );
}

export function ForecastAssumptionsModal({ value, onClose, onSave }: { value: ForecastAssumptions | null; onClose: () => void; onSave: (value: ForecastAssumptions) => void }) {
  const [draft, setDraft] = useState<ForecastAssumptions | null>(value);
  useEffect(() => setDraft(value), [value]);
  if (!draft) return null;

  return (
    <ModalShell title="Forecast Assumptions" subtitle="Manual assumptions used in the 30/60/90/180 day forecast." onClose={onClose}>
      <SmartAutofillBox
        title="AI Autofill Forecast"
        placeholder="Example: Demand growth 8%, cost inflation 3%, risk trend 4 points, service drift -1 point. Q4 demand lift expected from industrial automation deployments."
        onApply={(text) => setDraft(autofillForecastFromText(draft, text))}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <FormField id="forecast-demand-growth" type="number" label="Forecast Demand Growth" helper="Expected demand growth across the forecast horizon." placeholder="Example: 8" unit="%" validation="Use positive or negative percentage." value={draft.demandGrowthPct} onChange={(demandGrowthPct) => setDraft({ ...draft, demandGrowthPct: Number(demandGrowthPct) })} />
        <FormField id="forecast-cost-inflation" type="number" label="Cost Inflation" helper="Expected cost inflation applied to projected scenario cost." placeholder="Example: 3" unit="%" validation="Use positive or negative percentage." value={draft.costInflationPct} onChange={(costInflationPct) => setDraft({ ...draft, costInflationPct: Number(costInflationPct) })} />
        <FormField id="forecast-risk-trend" type="number" label="Risk Trend" helper="Expected risk score drift across the forecast horizon." placeholder="Example: 5" unit="pts" validation="Use positive for worsening risk and negative for improvement." value={draft.riskTrendPct} onChange={(riskTrendPct) => setDraft({ ...draft, riskTrendPct: Number(riskTrendPct) })} />
        <FormField id="forecast-service-drift" type="number" label="Service Drift" helper="Expected service level drift across the forecast horizon." placeholder="Example: -2" unit="pts" validation="Use positive or negative points." value={draft.serviceDriftPct} onChange={(serviceDriftPct) => setDraft({ ...draft, serviceDriftPct: Number(serviceDriftPct) })} />
        <FormField id="forecast-notes" type="textarea" label="Seasonality Notes" helper="Context about demand seasonality, launch cycles, or known events." placeholder="Example: Q4 retail peak increases demand" validation="Optional." value={draft.seasonalityNotes} onChange={(seasonalityNotes) => setDraft({ ...draft, seasonalityNotes })} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" type="button" onClick={() => onSave(draft)}>Save Forecast</button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="panel max-h-[92vh] w-full max-w-5xl overflow-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-cyan-200/10 bg-ink-900/95 p-4 backdrop-blur-xl">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="text-sm text-cyan-100/50">{subtitle}</p>
          </div>
          <button className="btn px-2" type="button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ isNew, id, onDelete, onClose, onSave }: { isNew?: boolean; id: string; onDelete?: (id: string) => void; onClose: () => void; onSave: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-cyan-200/10 pt-4">
      {!isNew && onDelete && (
        <button className="btn btn-danger" type="button" onClick={() => onDelete(id)}>
          <Trash2 size={16} />
          Delete
        </button>
      )}
      <div className="ml-auto flex gap-2">
        <button className="btn" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" type="button" onClick={onSave}>Save</button>
      </div>
    </div>
  );
}

function StepTabs({ steps, activeStep, onChange }: { steps: string[]; activeStep: number; onChange: (step: number) => void }) {
  return (
    <div className="mb-4 grid gap-2 md:grid-cols-3">
      {steps.map((step, index) => (
        <button
          key={step}
          className={`rounded-md border px-3 py-2 text-left text-xs font-semibold transition ${activeStep === index ? "border-cyanline/45 bg-cyanline/15 text-white shadow-glow" : "border-cyan-200/10 bg-ink-950/45 text-cyan-100/55 hover:border-cyanline/30 hover:text-white"}`}
          type="button"
          onClick={() => onChange(index)}
        >
          <span className="block text-[0.65rem] text-cyan-100/40">Step {index + 1}</span>
          {step}
        </button>
      ))}
    </div>
  );
}

function CoordinateFields({ coordinates, onChange }: { coordinates: Coordinates; onChange: (coordinates: Coordinates) => void }) {
  return (
    <div className="rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3 md:col-span-2">
      <p className="text-xs font-semibold text-cyan-100/75">Map Coordinates</p>
      <p className="mt-1 text-[0.7rem] text-cyan-100/48">Prefilled from map placement. Adjust if you know the exact location.</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-[0.68rem] text-cyan-100/50">Latitude</span>
          <NumberInput className="input" step="0.001" value={displayLat(coordinates)} onChange={(value) => onChange(updateLat(coordinates, value))} />
        </label>
        <label className="grid gap-1">
          <span className="text-[0.68rem] text-cyan-100/50">Longitude</span>
          <NumberInput className="input" step="0.001" value={displayLng(coordinates)} onChange={(value) => onChange(updateLng(coordinates, value))} />
        </label>
      </div>
    </div>
  );
}
