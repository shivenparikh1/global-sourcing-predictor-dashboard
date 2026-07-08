import { Edit3, Eye, ToggleLeft, ToggleRight } from "lucide-react";
import { getRiskTag } from "../logic/predictionEngine";
import type { Supplier, SupplierPrediction } from "../logic/types";
import { currency, pct } from "./format";

interface SupplierCardProps {
  supplier: Supplier;
  prediction: SupplierPrediction;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onChange: (supplier: Supplier) => void;
}

const tagClass = (tag: string) => {
  if (tag === "High Risk") return "border-risk/40 bg-risk/20 text-orange-100";
  if (tag === "Low Risk") return "border-good/40 bg-good/10 text-green-100";
  return "border-amber-300/40 bg-amber-300/10 text-amber-100";
};

export default function SupplierCard({ supplier, prediction, selected, onSelect, onEdit, onChange }: SupplierCardProps) {
  const riskTag = getRiskTag(prediction.riskScore);

  return (
    <article
      data-testid={`supplier-card-${supplier.id}`}
      className={`rounded-lg border p-3 transition ${
        selected ? "border-cyanline/50 bg-cyanline/10 shadow-glow" : "border-cyan-200/10 bg-white/[0.035] hover:border-cyanline/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <button className="min-w-0 text-left" type="button" onClick={onSelect}>
          <h3 className="truncate text-sm font-semibold text-white">{supplier.name}</h3>
          <p className="text-xs text-cyan-100/50">{supplier.country}</p>
        </button>
        <span className={`shrink-0 rounded-md border px-2 py-1 text-[0.65rem] font-semibold ${tagClass(riskTag)}`}>{riskTag}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Metric label="Landed Cost" value={currency(prediction.landedCost)} />
        <Metric label="Lead Time" value={`${prediction.leadTime.toFixed(1)}d`} />
        <Metric label="Reliability" value={pct(prediction.reliability)} />
        <Metric label="ESG" value={prediction.esgScore.toFixed(0)} />
        <Metric label="Capacity" value={`${supplier.capacity.toLocaleString()} units`} />
        <Metric label="Mode" value={supplier.transportMode} />
      </div>

      <div className="mt-3 grid gap-2">
        <div className="flex items-center justify-between text-xs text-cyan-100/60">
          <span>Allocation</span>
          <span className="font-semibold text-slate-100">{supplier.included ? supplier.allocation.toFixed(1) : "0.0"}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={supplier.included ? supplier.allocation : 0}
          onChange={(event) => onChange({ ...supplier, included: Number(event.target.value) > 0, allocation: Number(event.target.value) })}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button className="btn px-2 text-xs" type="button" onClick={() => onChange({ ...supplier, included: !supplier.included })}>
          {supplier.included ? <ToggleRight size={15} className="text-good" /> : <ToggleLeft size={15} />}
          {supplier.included ? "In" : "Out"}
        </button>
        <button className="btn px-2 text-xs" type="button" onClick={onSelect}>
          <Eye size={15} />
          View
        </button>
        <button className="btn px-2 text-xs" type="button" onClick={onEdit}>
          <Edit3 size={15} />
          Edit
        </button>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-cyan-200/10 bg-ink-950/50 p-2">
      <p className="text-cyan-100/40">{label}</p>
      <p className="mt-0.5 truncate font-semibold text-slate-100">{value}</p>
    </div>
  );
}
