import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { PredictionResult } from "../logic/types";

export default function WarningPanel({ prediction }: { prediction: PredictionResult }) {
  if (!prediction.warnings.length) {
    return (
      <div className="panel-soft flex items-center gap-3 border-good/20 bg-good/5 p-3 text-sm text-good">
        <CheckCircle2 size={18} />
        All sourcing guardrails are currently within target.
      </div>
    );
  }

  return (
    <div className="panel-soft border-risk/25 bg-risk/5 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-orange-100">
        <AlertTriangle size={18} />
        Active Warnings
      </div>
      <div className="grid gap-2 text-xs text-orange-100/80">
        {prediction.warnings.map((warning) => (
          <div key={warning} className="rounded-md border border-risk/20 bg-risk/10 px-2 py-1.5">
            {warning}
          </div>
        ))}
      </div>
    </div>
  );
}
