import { Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { transportModes } from "../logic/seedData";
import { autofillRiskFromText } from "../logic/textAutofill";
import type { Coordinates, DemandHub, RiskEvent, Supplier, TransportMode } from "../logic/types";
import NumberInput from "./NumberInput";
import SmartAutofillBox from "./SmartAutofillBox";

interface RiskEventModalProps {
  risk: RiskEvent | null;
  suppliers: Supplier[];
  demandHubs: DemandHub[];
  isNew?: boolean;
  onClose: () => void;
  onSave: (risk: RiskEvent) => void;
  onDelete: (riskId: string) => void;
}

const numberFields: Array<[keyof RiskEvent, string, string]> = [
  ["costImpactPct", "Landed Cost Impact", "%"],
  ["freightImpactPct", "Freight Impact", "%"],
  ["leadTimeImpactDays", "Lead-Time Impact", "days"],
  ["reliabilityImpactPct", "Reliability Impact", "%"],
  ["riskScoreImpact", "Risk Score Impact", "score"],
  ["severity", "Severity", "0-100"],
  ["confidenceLevel", "Confidence Level", "%"],
];

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

export default function RiskEventModal({ risk, suppliers, demandHubs, isNew, onClose, onSave, onDelete }: RiskEventModalProps) {
  const [draft, setDraft] = useState<RiskEvent | null>(risk);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setDraft(risk);
    setStep(0);
  }, [risk]);

  if (!draft) return null;

  const countries = Array.from(new Set(suppliers.map((supplier) => supplier.country)));
  const toggleSupplier = (id: string) => {
    const has = draft.affectedSupplierIds.includes(id);
    setDraft({ ...draft, affectedSupplierIds: has ? draft.affectedSupplierIds.filter((item) => item !== id) : [...draft.affectedSupplierIds, id] });
  };
  const toggleDemandHub = (id: string) => {
    const has = draft.affectedDemandHubIds.includes(id);
    setDraft({ ...draft, affectedDemandHubIds: has ? draft.affectedDemandHubIds.filter((item) => item !== id) : [...draft.affectedDemandHubIds, id] });
  };
  const toggleCountry = (country: string) => {
    const has = draft.affectedCountries.includes(country);
    setDraft({ ...draft, affectedCountries: has ? draft.affectedCountries.filter((item) => item !== country) : [...draft.affectedCountries, country] });
  };
  const toggleMode = (mode: TransportMode) => {
    const has = draft.affectedModes.includes(mode);
    setDraft({ ...draft, affectedModes: has ? draft.affectedModes.filter((item) => item !== mode) : [...draft.affectedModes, mode] });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="panel max-h-[92vh] w-full max-w-4xl overflow-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-cyan-200/10 bg-ink-900/95 p-4 backdrop-blur-xl">
          <div>
            <h2 className="text-lg font-semibold text-white">{isNew ? "Add Risk Event" : "Risk Event Details"}</h2>
            <p className="text-sm text-cyan-100/50">Editable impact assumptions used by the decision model</p>
          </div>
          <button className="btn px-2" type="button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-cyan-200/10 px-4 py-3">
          <StepTabs steps={["Event Definition", "Affected Scope", "Impacts & Mitigation"]} activeStep={step} onChange={setStep} />
        </div>

        <div className="p-4">
        <SmartAutofillBox
          title="AI Autofill Risk Event"
          placeholder="Example: Risk: Pacific Port Congestion. High probability, duration 60 days, affects Taiwan and Sea lanes, cost impact 4%, freight impact 8%, lead-time impact 7 days, reliability impact 3%, risk score impact 8, severity 78, confidence 76%."
          onApply={(text) => setDraft(autofillRiskFromText(draft, text, suppliers, demandHubs))}
        />
        {step === 0 && (
          <section className="panel-soft p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">Event Definition</h3>
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-cyan-100/70">Name</span>
                <input className="input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-cyan-100/70">Description</span>
                <textarea className="input min-h-24" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
              </label>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-1">
                  <span className="text-xs text-cyan-100/70">Probability</span>
                  <select className="input" value={draft.probability} onChange={(event) => setDraft({ ...draft, probability: event.target.value as RiskEvent["probability"] })}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-cyan-100/70">Duration</span>
                  <select
                    className="input"
                    value={draft.durationDays}
                    onChange={(event) => setDraft({ ...draft, durationDays: Number(event.target.value) as RiskEvent["durationDays"] })}
                  >
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                    <option value={180}>180 days</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 pt-6 text-sm text-cyan-100/75">
                  <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
                  Active
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {numberFields.slice(5).map(([key, label, unit]) => (
                  <label key={key} className="grid gap-1">
                    <span className="text-xs text-cyan-100/70">{label}</span>
                    <div className="flex overflow-hidden rounded-md border border-cyan-200/20 bg-ink-950/70">
                      <NumberInput
                        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none"
                        value={draft[key] as number}
                        onChange={(value) => setDraft({ ...draft, [key]: value })}
                      />
                      <span className="flex min-w-14 items-center justify-center border-l border-cyan-200/10 px-2 text-[0.68rem] text-cyan-100/50">{unit}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="panel-soft p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">Affected Scope</h3>
            <div className="grid gap-4">
              <CheckboxGroup title="Countries" items={countries} checked={draft.affectedCountries} onToggle={toggleCountry} />
              <CheckboxGroup title="Transport Modes" items={transportModes} checked={draft.affectedModes} onToggle={(value) => toggleMode(value as TransportMode)} />
              <div>
                <p className="mb-2 text-xs font-semibold text-cyan-100/70">Suppliers</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {suppliers.map((supplier) => (
                    <label key={supplier.id} className="flex items-center gap-2 rounded-md border border-cyan-200/10 bg-ink-950/50 px-2 py-2 text-xs text-cyan-100/70">
                      <input type="checkbox" checked={draft.affectedSupplierIds.includes(supplier.id)} onChange={() => toggleSupplier(supplier.id)} />
                      <span className="truncate">{supplier.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-cyan-100/70">Affected Demand Hubs</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {demandHubs.length ? (
                    demandHubs.map((hub) => (
                      <label key={hub.id} className="flex items-center gap-2 rounded-md border border-cyan-200/10 bg-ink-950/50 px-2 py-2 text-xs text-cyan-100/70">
                        <input type="checkbox" checked={draft.affectedDemandHubIds.includes(hub.id)} onChange={() => toggleDemandHub(hub.id)} />
                        <span className="truncate">{hub.name || "Unnamed demand hub"}</span>
                      </label>
                    ))
                  ) : (
                    <p className="rounded-md border border-cyan-200/10 bg-ink-950/45 p-2 text-xs text-cyan-100/50">Add demand hubs to scope risks by destination.</p>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-cyan-100/70">Map Marker Coordinates</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <span className="text-[0.68rem] text-cyan-100/50">Latitude</span>
                    <NumberInput
                      className="input"
                      step="0.001"
                      value={displayLat(draft.coordinates)}
                      onChange={(value) => setDraft({ ...draft, coordinates: updateLat(draft.coordinates, value) })}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[0.68rem] text-cyan-100/50">Longitude</span>
                    <NumberInput
                      className="input"
                      step="0.001"
                      value={displayLng(draft.coordinates)}
                      onChange={(value) => setDraft({ ...draft, coordinates: updateLng(draft.coordinates, value) })}
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="panel-soft p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">Impacts & Mitigation</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {numberFields.slice(0, 5).map(([key, label, unit]) => (
                <label key={key} className="grid gap-1">
                  <span className="text-xs text-cyan-100/70">{label}</span>
                  <div className="flex overflow-hidden rounded-md border border-cyan-200/20 bg-ink-950/70">
                    <NumberInput
                      className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none"
                      value={draft[key] as number}
                      onChange={(value) => setDraft({ ...draft, [key]: value })}
                    />
                    <span className="flex min-w-14 items-center justify-center border-l border-cyan-200/10 px-2 text-[0.68rem] text-cyan-100/50">{unit}</span>
                  </div>
                </label>
              ))}
              <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-50/82 md:col-span-2">
                Suggested mitigations will appear in the map inspector after saving. Use the description and impact fields to make the mitigation plan specific.
              </div>
            </div>
          </section>
        )}
        </div>

        <div className="sticky bottom-0 flex flex-wrap justify-between gap-3 border-t border-cyan-200/10 bg-ink-900/95 p-4 backdrop-blur-xl">
          {!isNew && (
            <button className="btn btn-danger" type="button" onClick={() => onDelete(draft.id)}>
              <Trash2 size={16} />
              Delete Event
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button className="btn" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" type="button" onClick={() => onSave(draft)}>
              Save Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepTabs({ steps, activeStep, onChange }: { steps: string[]; activeStep: number; onChange: (step: number) => void }) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
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

function CheckboxGroup({ title, items, checked, onToggle }: { title: string; items: string[]; checked: string[]; onToggle: (value: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-cyan-100/70">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <label key={item} className="flex items-center gap-2 rounded-md border border-cyan-200/10 bg-ink-950/50 px-2 py-2 text-xs text-cyan-100/70">
            <input type="checkbox" checked={checked.includes(item)} onChange={() => onToggle(item)} />
            {item}
          </label>
        ))}
      </div>
    </div>
  );
}
