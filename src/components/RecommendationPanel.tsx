import { Bot, ClipboardList, Eye, Send, Wand2 } from "lucide-react";
import { useState } from "react";
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
  const [memoOpen, setMemoOpen] = useState(false);
  const missing = recommendation.missingData.slice(0, 4);
  return (
    <section className="panel-soft flex h-full flex-col p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Recommendation Panel</h3>
          <p className="text-xs text-cyan-100/50">Rule-based local recommendation, no API calls</p>
        </div>
        <Bot className="text-cyanline" size={19} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${decisionClass(recommendation.finalDecision)}`}>{recommendation.finalDecision.toUpperCase()}</span>
        <span className="rounded-md border border-cyan-200/10 bg-ink-950/50 px-2 py-1 text-xs text-cyan-100/60">Best Lever: {recommendation.bestLever}</span>
        <span className="rounded-md border border-risk/20 bg-risk/10 px-2 py-1 text-xs text-orange-100/75">Biggest Risk: {recommendation.biggestRisk}</span>
      </div>
      <div className="mt-3 grid flex-1 gap-2 sm:grid-cols-2">
        <RecommendationCard title="Recommended Allocation" value={recommendation.recommendedAllocation} />
        <RecommendationCard title="Why This Plan" value={recommendation.whyThisPlan} />
        <RecommendationCard title="Recommended Action" value={recommendation.recommendedAction} tone="cyan" />
        <RecommendationCard title="Biggest Risk" value={recommendation.biggestRisk} tone="risk" />
        <RecommendationCard title="Best Next Action" value={recommendation.bestLever} />
        <RecommendationCard title="Key Tradeoff" value={recommendation.keyTradeoff} tone="warn" />
        <RecommendationCard title="Confidence" value={recommendation.confidence} />
        <RecommendationCard title="Missing Data" value={missing.length ? missing.join(", ") : "No critical missing fields detected."} tone={missing.length ? "warn" : "good"} />
        <RecommendationCard title="Final Decision" value={recommendation.finalDecision.toUpperCase()} tone={recommendation.finalDecision === "approve" ? "good" : recommendation.finalDecision === "reject" ? "risk" : "warn"} />
      </div>
      {memoOpen && (
        <div className="mt-3 rounded-lg border border-cyan-200/10 bg-ink-950/50 p-3 text-sm leading-6 text-cyan-50/80">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100/50">
            <ClipboardList size={14} />
            Executive Memo
          </div>
          {recommendation.text}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-cyan-100/50">Generated {generatedAt}</span>
        <div className="flex gap-2">
          <button className="btn" type="button" onClick={() => setMemoOpen((open) => !open)}>
            <Eye size={16} />
            {memoOpen ? "Hide Executive Memo" : "View Executive Memo"}
          </button>
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

function RecommendationCard({ title, value, tone = "neutral" }: { title: string; value: string; tone?: "neutral" | "good" | "warn" | "risk" | "cyan" }) {
  const toneClass =
    tone === "good"
      ? "border-good/25 bg-good/10"
      : tone === "warn"
        ? "border-amber-300/25 bg-amber-300/10"
        : tone === "risk"
          ? "border-risk/25 bg-risk/10"
          : tone === "cyan"
            ? "border-cyanline/25 bg-cyanline/10"
            : "border-cyan-200/10 bg-ink-950/48";
  return (
    <article className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-cyan-100/45">{title}</p>
      <p className="mt-1 text-sm leading-5 text-cyan-50/86">{value}</p>
    </article>
  );
}
