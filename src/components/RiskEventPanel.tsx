import { AlertTriangle, Edit3, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import type { RiskEvent } from "../logic/types";
import EmptyState from "./EmptyState";

interface RiskEventPanelProps {
  risks: RiskEvent[];
  onChangeRisk: (risk: RiskEvent) => void;
  onEditRisk: (risk: RiskEvent) => void;
  onAddRisk: () => void;
}

const probabilityClass = (probability: RiskEvent["probability"]) => {
  if (probability === "High") return "text-risk";
  if (probability === "Medium") return "text-amber-300";
  return "text-good";
};

export default function RiskEventPanel({ risks, onChangeRisk, onEditRisk, onAddRisk }: RiskEventPanelProps) {
  return (
    <section className="panel-soft p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Risk Events</h3>
          <p className="text-xs text-cyan-100/50">Disruptions adjust cost, lead time, reliability, and map risk</p>
        </div>
        <button className="btn btn-primary px-2" type="button" onClick={onAddRisk} title="Add Risk Event">
          <Plus size={16} />
        </button>
      </div>
      {!risks.length && (
        <EmptyState
          title="No active risk events added yet."
          body="Add geopolitical, weather, logistics, currency, or supplier risks to stress-test your sourcing network."
          actionLabel="Add Risk Event"
          onAction={onAddRisk}
        />
      )}
      <div className="grid max-h-64 gap-2 overflow-auto pr-1">
        {risks.map((risk) => (
          <article key={risk.id} className={`rounded-lg border p-3 ${risk.active ? "border-risk/25 bg-risk/10" : "border-cyan-200/10 bg-white/[0.025]"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className={risk.active ? "text-risk" : "text-cyan-100/40"} />
                  <h4 className="truncate text-sm font-semibold text-white">{risk.name}</h4>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-cyan-100/60">{risk.description}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button className="btn px-2" type="button" onClick={() => onChangeRisk({ ...risk, active: !risk.active })} title="Toggle Risk" data-testid={`risk-toggle-${risk.id}`}>
                  {risk.active ? <ToggleRight size={15} className="text-risk" /> : <ToggleLeft size={15} />}
                </button>
                <button className="btn px-2" type="button" onClick={() => onEditRisk(risk)} title="Edit Risk">
                  <Edit3 size={15} />
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-[0.68rem]">
              <Badge label="Probability" value={risk.probability} className={probabilityClass(risk.probability)} />
              <Badge label="Lead" value={`+${risk.leadTimeImpactDays}d`} />
              <Badge label="Cost" value={`+${risk.costImpactPct + risk.freightImpactPct}%`} />
              <Badge label="Duration" value={`${risk.durationDays}d`} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Badge({ label, value, className = "text-slate-100" }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-md border border-cyan-200/10 bg-ink-950/50 px-2 py-1">
      <p className="text-cyan-100/40">{label}</p>
      <p className={`font-semibold ${className}`}>{value}</p>
    </div>
  );
}
