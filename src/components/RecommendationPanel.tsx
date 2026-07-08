import { Bot, Send, Wand2 } from "lucide-react";
import type { Recommendation } from "../logic/types";

interface RecommendationPanelProps {
  recommendation: Recommendation;
  generatedAt: string;
  onGenerate: () => void;
  onApply: () => void;
}

const decisionClass = (decision: Recommendation["finalDecision"]) => {
  if (decision === "approve") return "border-good/40 bg-good/10 text-green-100";
  if (decision === "reject") return "border-risk/40 bg-risk/20 text-orange-100";
  return "border-amber-300/40 bg-amber-300/10 text-amber-100";
};

export default function RecommendationPanel({ recommendation, generatedAt, onGenerate, onApply }: RecommendationPanelProps) {
  return (
    <section className="panel-soft flex h-full flex-col p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">AI Recommendation Panel</h3>
          <p className="text-xs text-cyan-100/50">Rule-based local recommendation, no API calls</p>
        </div>
        <Bot className="text-cyanline" size={19} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${decisionClass(recommendation.finalDecision)}`}>{recommendation.finalDecision.toUpperCase()}</span>
        <span className="rounded-md border border-cyan-200/10 bg-ink-950/50 px-2 py-1 text-xs text-cyan-100/60">Best Lever: {recommendation.bestLever}</span>
        <span className="rounded-md border border-risk/20 bg-risk/10 px-2 py-1 text-xs text-orange-100/75">Biggest Risk: {recommendation.biggestRisk}</span>
      </div>
      <p className="mt-3 flex-1 rounded-lg border border-cyan-200/10 bg-ink-950/50 p-3 text-sm leading-6 text-cyan-50/80">{recommendation.text}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-cyan-100/50">Generated {generatedAt}</span>
        <div className="flex gap-2">
          <button className="btn" type="button" onClick={onGenerate} data-testid="generate-recommendation">
            <Wand2 size={16} />
            Generate Recommendation
          </button>
          <button className="btn btn-primary" type="button" onClick={onApply} data-testid="apply-recommendation">
            <Send size={16} />
            Apply Plan
          </button>
        </div>
      </div>
    </section>
  );
}
