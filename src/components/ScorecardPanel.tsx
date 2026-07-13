import { Activity, Boxes, CircleDollarSign, Gauge, Leaf, Route, ShieldCheck, TrendingDown, TrendingUp, Zap } from "lucide-react";
import type { PredictionResult, Recommendation } from "../logic/types";
import { currency, pct } from "./format";

interface ScorecardPanelProps {
  prediction: PredictionResult;
  recommendation: Recommendation;
}

const scoreColor = (value: number, goodAbove = 80) => (value >= goodAbove ? "text-good" : value >= goodAbove - 18 ? "text-amber-300" : "text-risk");

export default function ScorecardPanel({ prediction, recommendation }: ScorecardPanelProps) {
  const allocationSummary = Object.values(recommendation.supplierMix)
    .filter(Boolean)
    .slice(0, 3)
    .map((value) => `${value.toFixed(0)}%`)
    .join(" / ");

  const cards = [
    {
      label: "Total Landed Cost",
      value: currency(prediction.totalScenarioCost),
      sub: `${currency(prediction.avgLandedCost)} per unit`,
      icon: CircleDollarSign,
      trend: prediction.budgetUsedPct <= 100 ? "Within budget" : "Over budget",
      positive: prediction.budgetUsedPct <= 100,
    },
    {
      label: "Average Lead Time",
      value: `${prediction.avgLeadTime.toFixed(1)}d`,
      sub: "Weighted by Allocation",
      icon: Route,
      trend: prediction.avgLeadTime <= 42 ? "Controlled" : "Elevated",
      positive: prediction.avgLeadTime <= 42,
    },
    {
      label: "Weighted Supplier Risk",
      value: prediction.weightedRisk.toFixed(1),
      sub: "Risk Score",
      icon: Gauge,
      trend: prediction.weightedRisk < 55 ? "Stable" : "Watchlist",
      positive: prediction.weightedRisk < 55,
    },
    {
      label: "Service-Level Estimate",
      value: pct(prediction.serviceLevel),
      sub: "OTIF Confidence",
      icon: ShieldCheck,
      trend: prediction.serviceLevel >= 92 ? "Target met" : "Below target",
      positive: prediction.serviceLevel >= 92,
    },
    {
      label: "Data Confidence",
      value: pct(prediction.confidenceScore),
      sub: prediction.missingDataFields.length ? `${prediction.missingDataFields.length} Fields Missing` : "Required Fields Complete",
      icon: Gauge,
      trend: prediction.confidenceScore >= 90 ? "High" : prediction.confidenceScore >= 60 ? "Medium" : "Low",
      positive: prediction.confidenceScore >= 60,
    },
    {
      label: "Capacity Utilization",
      value: pct(prediction.capacityUtilization * 100),
      sub: `${prediction.totalAvailableCapacity.toLocaleString()} Unit Capacity`,
      icon: Boxes,
      trend: prediction.capacityUtilization < 0.88 ? "Headroom" : "Tight",
      positive: prediction.capacityUtilization < 0.88,
    },
    {
      label: "ESG Average",
      value: prediction.esgAverage.toFixed(0),
      sub: "Weighted Score",
      icon: Leaf,
      trend: prediction.esgAverage >= 70 ? "On target" : "Below target",
      positive: prediction.esgAverage >= 70,
    },
    {
      label: "Budget Used",
      value: pct(prediction.budgetUsedPct),
      sub: "of Monthly Budget",
      icon: Activity,
      trend: prediction.budgetUsedPct <= 100 ? "Available" : "Exceeded",
      positive: prediction.budgetUsedPct <= 100,
    },
    {
      label: "Recommended Allocation",
      value: allocationSummary || "Run plan",
      sub: recommendation.finalDecision,
      icon: Zap,
      trend: recommendation.bestLever,
      positive: recommendation.finalDecision === "approve",
    },
    {
      label: "Risk-Adjusted Cost",
      value: currency(prediction.riskAdjustedCost),
      sub: "Risk Premium Included",
      icon: TrendingDown,
      trend: prediction.weightedRisk < 55 ? "Efficient" : "Premium high",
      positive: prediction.weightedRisk < 55,
    },
    {
      label: "Resilience Score",
      value: prediction.resilienceScore.toFixed(0),
      sub: "Network Strength",
      icon: TrendingUp,
      trend: prediction.resilienceScore >= 75 ? "High" : "Needs work",
      positive: prediction.resilienceScore >= 75,
    },
  ];

  return (
    <aside className="panel flex min-h-0 flex-col p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Network Metrics</h2>
          <p className="text-xs text-cyan-100/50">Live decision-model output</p>
        </div>
        <span className={`rounded-md border px-2 py-1 text-xs ${scoreColor(prediction.resilienceScore)} border-current/30 bg-current/10`}>
          {prediction.activeSupplierCount} active
        </span>
      </div>
      <div className="grid gap-2 overflow-auto pr-1">
        {cards.map((card) => {
          const Icon = card.icon;
          const testId = `metric-${card.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
          return (
            <div key={card.label} data-testid={testId} className="panel-soft grid grid-cols-[2.25rem_1fr] gap-3 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-cyanline/20 bg-cyanline/10 text-cyanline shadow-glow">
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-xs text-cyan-100/60">{card.label}</p>
                  <span className={card.positive ? "text-good" : "text-risk"}>{card.positive ? "down" : "up"}</span>
                </div>
                <p className="metric-value mt-1" data-testid={`${testId}-value`}>
                  {card.value}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-slate-400">{card.sub}</span>
                  <span className={card.positive ? "text-good" : "text-amber-300"}>{card.trend}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
