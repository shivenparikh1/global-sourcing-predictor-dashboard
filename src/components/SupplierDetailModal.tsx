import { Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { fieldHelp } from "../logic/descriptors";
import { countryOptions, getRegionForCountry, productCategoryOptions, regionOptions } from "../logic/referenceData";
import { transportModes } from "../logic/seedData";
import type { Coordinates, Supplier, TransportMode } from "../logic/types";
import FormField from "./FormField";
import NumberInput from "./NumberInput";
import SearchableSelect from "./SearchableSelect";

interface SupplierDetailModalProps {
  supplier: Supplier | null;
  isNew?: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
  onDelete: (supplierId: string) => void;
}

const scoreField = fieldHelp.riskScore;

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

const numberFields: Array<{
  key: keyof Supplier;
  help: { label: string; helper: string; placeholder: string; unit?: string; validation: string };
  min?: number;
  max?: number;
}> = [
  { key: "baseUnitCost", help: fieldHelp.baseUnitCost, min: 0 },
  { key: "tariffRate", help: fieldHelp.tariffRate, min: 0 },
  {
    key: "freightCost",
    min: 0,
    help: {
      ...fieldHelp.freightCost,
      label: "Fallback Freight Cost",
      helper: "Used only when no active route freight cost has been entered for this supplier.",
    },
  },
  { key: "insuranceRate", help: fieldHelp.insuranceRate, min: 0 },
  { key: "leadTime", help: fieldHelp.leadTime, min: 0 },
  { key: "reliability", help: fieldHelp.reliability, min: 0, max: 100 },
  { key: "capacity", help: fieldHelp.capacity, min: 0 },
  { key: "moq", help: fieldHelp.moq, min: 0 },
  { key: "esgScore", help: fieldHelp.esgScore, min: 0, max: 100 },
  { key: "qualityScore", help: fieldHelp.qualityScore, min: 0, max: 100 },
  { key: "politicalRisk", min: 0, max: 100, help: { ...scoreField, label: "Political Risk", helper: "Country or regional instability that can affect supplier continuity." } },
  { key: "currencyRisk", min: 0, max: 100, help: { ...scoreField, label: "Currency Risk", helper: "Exposure to exchange-rate volatility in the supplier market." } },
  { key: "naturalDisasterRisk", min: 0, max: 100, help: { ...scoreField, label: "Natural Disaster Risk", helper: "Weather, flood, seismic, storm, or climate exposure around the supplier." } },
  { key: "financialHealth", help: fieldHelp.financialHealth, min: 0, max: 100 },
  {
    key: "allocation",
    min: 0,
    max: 100,
    help: {
      label: "Manual Allocation",
      helper: "Optional share used when you manually allocate demand before optimization.",
      placeholder: "Example: 40",
      unit: "%",
      validation: "Allocation must be between 0 and 100.",
    },
  },
];

export default function SupplierDetailModal({ supplier, isNew, onClose, onSave, onDelete }: SupplierDetailModalProps) {
  const [draft, setDraft] = useState<Supplier | null>(supplier);

  useEffect(() => setDraft(supplier), [supplier]);

  if (!draft) return null;

  const mode = draft.transportMode;
  const profile = draft.transportOverrides[mode];
  const update = <K extends keyof Supplier>(key: K, value: Supplier[K]) => setDraft({ ...draft, [key]: value });
  const updateProfile = (key: keyof typeof profile, value: number | TransportMode) => {
    setDraft({
      ...draft,
      transportOverrides: {
        ...draft.transportOverrides,
        [mode]: { ...profile, [key]: value },
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="panel max-h-[92vh] w-full max-w-5xl overflow-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-cyan-200/10 bg-ink-900/95 p-4 backdrop-blur-xl">
          <div>
            <h2 className="text-lg font-semibold text-white">{isNew ? "Add Supplier" : "Supplier Details"}</h2>
            <p className="text-sm text-cyan-100/50">Editable commercial, risk, capacity, and transport assumptions</p>
          </div>
          <button className="btn px-2" type="button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="panel-soft p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">Supplier Profile</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField id="supplier-name" {...fieldHelp.supplierName} value={draft.name} onChange={(name) => update("name", name)} />
              <SearchableSelect
                label={fieldHelp.country.label}
                helper={fieldHelp.country.helper}
                value={draft.country}
                options={countryOptions}
                placeholder={fieldHelp.country.placeholder}
                onChange={(country) => setDraft({ ...draft, country, region: draft.region || getRegionForCountry(country) })}
              />
              <SearchableSelect
                label={fieldHelp.region.label}
                helper={fieldHelp.region.helper}
                value={draft.region}
                options={regionOptions}
                placeholder={fieldHelp.region.placeholder}
                onChange={(region) => update("region", region)}
              />
              <SearchableSelect
                label={fieldHelp.productCategory.label}
                helper={fieldHelp.productCategory.helper}
                value={draft.productCategory}
                options={productCategoryOptions}
                placeholder={fieldHelp.productCategory.placeholder}
                onChange={(productCategory) => update("productCategory", productCategory)}
              />
              <label className="grid gap-1">
                <span className="text-xs text-cyan-100/70">Transport Mode</span>
                <select className="input" value={draft.transportMode} onChange={(event) => update("transportMode", event.target.value as TransportMode)}>
                  {transportModes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              {numberFields.map(({ key, help, min, max }) => (
                <FormField
                  key={key}
                  id={`supplier-${String(key)}`}
                  type="number"
                  min={min}
                  max={max}
                  {...help}
                  value={draft[key] as number}
                  onChange={(value) => update(key, Number(value) as never)}
                />
              ))}
              <div className="md:col-span-2">
                <FormField id="supplier-notes" type="textarea" label="Notes" helper="Optional sourcing context, constraints, certifications, or follow-up items." placeholder="Example: Requires PPAP audit before award" validation="Optional." value={draft.notes} onChange={(notes) => update("notes", notes)} />
              </div>
            </div>
          </section>

          <section className="panel-soft p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">Transport Mode Editor</h3>
            <div className="grid gap-3">
              <TransportField label="Freight Cost per Unit" value={profile.freightCost} unit="USD" onChange={(value) => updateProfile("freightCost", value)} />
              <TransportField label="Transit Time" value={profile.transitTime} unit="days" onChange={(value) => updateProfile("transitTime", value)} />
              <TransportField label="Delay Probability" value={profile.delayProbability} unit="%" onChange={(value) => updateProfile("delayProbability", value)} />
              <TransportField label="Emissions Factor" value={profile.emissionsFactor} unit="kg/unit" onChange={(value) => updateProfile("emissionsFactor", value)} />
              <TransportField label="Port Congestion Risk" value={profile.congestionRisk} unit="score" onChange={(value) => updateProfile("congestionRisk", value)} />
            </div>
            <div className="mt-4 grid gap-2 rounded-lg border border-cyan-200/10 bg-ink-950/50 p-3 text-xs text-cyan-100/70">
              <span>Map Coordinates</span>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1">
                  <span className="text-[0.68rem] text-cyan-100/50">Latitude</span>
                  <NumberInput
                    className="input"
                    step="0.001"
                    value={displayLat(draft.coordinates)}
                    onChange={(value) => update("coordinates", updateLat(draft.coordinates, value))}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[0.68rem] text-cyan-100/50">Longitude</span>
                  <NumberInput
                    className="input"
                    step="0.001"
                    value={displayLng(draft.coordinates)}
                    onChange={(value) => update("coordinates", updateLng(draft.coordinates, value))}
                  />
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex flex-wrap justify-between gap-3 border-t border-cyan-200/10 bg-ink-900/95 p-4 backdrop-blur-xl">
          {!isNew && (
            <button className="btn btn-danger" type="button" onClick={() => onDelete(draft.id)}>
              <Trash2 size={16} />
              Delete Supplier
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button className="btn" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" type="button" onClick={() => onSave(draft)}>
              Save Supplier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransportField({ label, value, unit, onChange }: { label: string; value: number; unit: string; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-cyan-100/70">{label}</span>
      <div className="flex overflow-hidden rounded-md border border-cyan-200/20 bg-ink-950/70">
        <NumberInput className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none" value={value} onChange={onChange} />
        <span className="flex min-w-16 items-center justify-center border-l border-cyan-200/10 px-2 text-[0.68rem] text-cyan-100/50">{unit}</span>
      </div>
    </label>
  );
}
