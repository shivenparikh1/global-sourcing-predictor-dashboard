import { CheckCircle2, Circle, SlidersHorizontal } from "lucide-react";
import type { NegotiationLever } from "../logic/types";
import EmptyState from "./EmptyState";

interface NegotiationLeverPanelProps {
  levers: NegotiationLever[];
  onToggleLever: (id: string) => void;
}

export default function NegotiationLeverPanel({ levers, onToggleLever }: NegotiationLeverPanelProps) {
  return (
    <section className="panel-soft p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Negotiation Levers</h3>
          <p className="text-xs text-cyan-100/50">Toggle before and after impacts</p>
        </div>
        <SlidersHorizontal className="text-cyanline" size={18} />
      </div>
      {!levers.length && (
        <EmptyState
          title="No negotiation levers added yet."
          body="Add price concessions, volume commitments, dual sourcing, expedited shipping, buffer inventory, supplier development, nearshoring, or contract flexibility levers."
        />
      )}
      <div className="grid max-h-64 gap-2 overflow-auto pr-1 sm:grid-cols-2 xl:grid-cols-1">
        {levers.map((lever) => (
          <button
            key={lever.id}
            data-testid={`lever-${lever.id}`}
            type="button"
            onClick={() => onToggleLever(lever.id)}
            className={`rounded-lg border p-3 text-left transition ${
              lever.active ? "border-cyanline/40 bg-cyanline/10" : "border-cyan-200/10 bg-white/[0.025] hover:border-cyanline/30"
            }`}
          >
            <div className="flex items-start gap-2">
              {lever.active ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-good" /> : <Circle size={17} className="mt-0.5 shrink-0 text-cyan-100/50" />}
              <div>
                <p className="text-sm font-semibold text-white">{lever.name}</p>
                <p className="mt-1 text-xs text-cyan-100/60">{lever.effect}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
