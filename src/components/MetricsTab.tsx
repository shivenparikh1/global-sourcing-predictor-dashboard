import { Activity, BarChart3, Boxes, CircleDollarSign, ClipboardList, Gauge, Leaf, Route, ShieldCheck, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";
import { buildSupplierScorecards, sourceNoteForScenario } from "../logic/scoringModel";
import type { PredictionResult, Scenario } from "../logic/types";
import EmptyState from "./EmptyState";
import { compactDateTime, currency, pct } from "./format";

export default function MetricsTab({ scenario, prediction }: { scenario: Scenario; prediction: PredictionResult }) {
  const hasData = prediction.activeSupplierCount > 0 && prediction.totalDemand > 0 && prediction.activeRouteCount > 0 && prediction.confidenceScore >= 60;
  const scorecards = buildSupplierScorecards(scenario, prediction);
  const sourceNote = sourceNoteForScenario(scenario);
  const cards = [
    { label: "Total Landed Cost", value: hasData ? currency(prediction.totalScenarioCost) : "Pending input", icon: CircleDollarSign, status: hasData ? "Calculated" : "No Data" },
    { label: "Average Unit Cost", value: hasData ? currency(prediction.avgLandedCost) : "Incomplete", icon: TrendingDown, status: "Per Unit" },
    { label: "Average Lead Time", value: hasData ? `${prediction.avgLeadTime.toFixed(1)}d` : "Incomplete", icon: Route, status: "Weighted" },
    { label: "Weighted Supplier Risk", value: hasData ? prediction.weightedRisk.toFixed(1) : "No data", icon: Gauge, status: "0-100" },
    { label: "Risk-Adjusted Cost", value: hasData ? currency(prediction.riskAdjustedCost) : "Pending", icon: Activity, status: "Premium Included" },
    { label: "Service-Level Estimate", value: hasData ? pct(prediction.serviceLevel) : "Pending", icon: ShieldCheck, status: "OTIF" },
    { label: "Demand Coverage", value: hasData ? pct(prediction.demandCoveragePct) : "Pending", icon: Target, status: "Served Demand" },
    { label: "Shortage Risk", value: hasData ? pct(prediction.shortageRisk) : "Pending", icon: TrendingUp, status: "Estimated" },
    { label: "Capacity Utilization", value: hasData ? pct(prediction.capacityUtilization * 100) : "Pending", icon: Boxes, status: "Included Suppliers" },
    { label: "ESG Weighted Average", value: hasData ? prediction.esgAverage.toFixed(0) : "Pending", icon: Leaf, status: "Score" },
    { label: "Network Resilience", value: hasData ? prediction.resilienceScore.toFixed(0) : "Incomplete", icon: Sparkles, status: "Strength" },
    { label: "Data Confidence", value: pct(prediction.confidenceScore), icon: BarChart3, status: prediction.confidenceScore >= 90 ? "High" : prediction.confidenceScore >= 60 ? "Medium" : "Low" },
  ];

  return (
    <section className="grid gap-4 animate-tab-in">
      <div className="panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Metrics</h2>
            <p className="mt-1 text-sm text-cyan-100/55">Dense performance readout from manually entered supplier, demand, route, and risk data.</p>
          </div>
          <span className="rounded-md border border-cyanline/25 bg-cyanline/10 px-3 py-2 text-sm text-cyan-100">{prediction.confidenceScore}% complete</span>
        </div>
      </div>

      {!hasData && (
        <EmptyState
          title="Metrics unavailable until network data is complete."
          body="Add at least one supplier, one demand hub, one active route, supplier cost, supplier capacity, route cost, lead time, and demand volume."
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="panel-soft p-3 transition duration-200 hover:-translate-y-0.5 hover:border-cyanline/35 hover:bg-cyanline/[0.055]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-cyanline/20 bg-cyanline/10 text-cyanline shadow-glow">
                  <Icon size={18} />
                </div>
                <span className="text-xs text-cyan-100/42">{card.status}</span>
              </div>
              <p className="mt-3 text-xs text-cyan-100/55">{card.label}</p>
              <p className="mt-1 text-xl font-semibold text-white">{card.value}</p>
            </article>
          );
        })}
      </div>

      <ScoringModelPanel scorecards={scorecards} sourceNote={sourceNote} />

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel title="Capacity Utilization by Supplier">
          <BarList rows={scenario.suppliers.map((supplier) => {
            const supplierPrediction = prediction.suppliers.find((item) => item.supplierId === supplier.id);
            return { label: supplier.name || "Unnamed supplier", value: Math.round((supplierPrediction?.capacityUtilization ?? 0) * 100), unit: "%" };
          })} empty="Add suppliers and routes to see utilization." />
        </ChartPanel>
        <ChartPanel title="Demand Coverage by Hub">
          <BarList rows={scenario.demandHubs.map((hub) => {
            const allocated = scenario.routes.filter((route) => route.active && route.demandHubId === hub.id).reduce((sum, route) => sum + route.allocationPct, 0);
            return { label: hub.name || "Unnamed hub", value: Math.min(100, Math.round(allocated)), unit: "%" };
          })} empty="Add demand hubs and routes to see coverage." />
        </ChartPanel>
        <ChartPanel title="Allocation by Supplier">
          <BarList rows={prediction.suppliers.map((supplier) => ({ label: supplier.supplierName || "Unnamed supplier", value: Math.round(supplier.allocationPct), unit: "%" }))} empty="Create active lanes to see allocation." />
        </ChartPanel>
        <ChartPanel title="Risk Breakdown">
          <BarList rows={prediction.suppliers.map((supplier) => ({ label: supplier.supplierName || "Unnamed supplier", value: Math.round(supplier.riskScore), unit: "" }))} empty="Add supplier and route risk inputs to see breakdown." color="risk" />
        </ChartPanel>
        <ChartPanel title="ESG Contribution by Supplier">
          <BarList rows={prediction.suppliers.map((supplier) => ({ label: supplier.supplierName || "Unnamed supplier", value: Math.round(supplier.esgScore), unit: "" }))} empty="Add ESG scores to see contribution." color="good" />
        </ChartPanel>
        <ChartPanel title="Cost Breakdown">
          <div className="grid gap-2">
            <CostRow label="Scenario Cost" value={hasData ? prediction.totalScenarioCost : 0} />
            <CostRow label="Risk-Adjusted Cost" value={hasData ? prediction.riskAdjustedCost : 0} />
            <CostRow label="Average Unit Cost" value={hasData ? prediction.avgLandedCost : 0} />
          </div>
        </ChartPanel>
      </div>

      <AuditTrailPanel scenario={scenario} />
    </section>
  );
}

function ScoringModelPanel({ scorecards, sourceNote }: { scorecards: ReturnType<typeof buildSupplierScorecards>; sourceNote: string }) {
  return (
    <section className="panel-soft p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList size={17} className="text-cyanline" />
            <h3 className="text-sm font-semibold text-white">Scoring Model</h3>
          </div>
          <p className="mt-1 text-xs leading-5 text-cyan-100/52">Supplier score = weighted average of category scores. Lower cost, lead time, and risk score higher; higher reliability, ESG, capacity headroom, and resilience score higher.</p>
        </div>
        <span className="rounded-md border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-xs text-amber-100">{sourceNote}</span>
      </div>

      {!scorecards.length ? (
        <p className="mt-4 rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3 text-sm text-cyan-100/55">Add suppliers and active routes to generate supplier scorecards.</p>
      ) : (
        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          {scorecards.map((card) => (
            <article key={card.supplierId} className="rounded-lg border border-cyan-200/10 bg-ink-950/48 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{card.supplierName}</p>
                  <p className="text-xs text-cyan-100/48">{card.country || "Country not set"}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-white">{card.score}</p>
                  <ScorePill label={card.confidence} />
                </div>
              </div>
              <p className="mt-3 rounded-md border border-cyanline/20 bg-cyanline/10 px-2 py-2 text-xs leading-5 text-cyan-50/82">{card.recommendedAction}</p>
              <div className="mt-3 grid gap-2">
                {card.categories.map((category) => (
                  <div key={category.label} className="grid gap-1">
                    <div className="flex items-center justify-between gap-2 text-[0.68rem]">
                      <span className="text-cyan-100/62">{category.label} · weight {category.weight}</span>
                      <span className="font-semibold text-white">{category.score}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-950">
                      <div className="h-full rounded-full bg-cyanline" style={{ width: `${category.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <details className="mt-3 rounded-md border border-cyan-200/10 bg-white/[0.025] px-3 py-2 text-xs text-cyan-100/62">
                <summary className="cursor-pointer font-semibold text-cyan-50">Assumptions and formula</summary>
                <p className="mt-2 leading-5">{card.formula}</p>
                <ul className="mt-2 grid gap-1 leading-5">
                  {card.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
                </ul>
              </details>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ScorePill({ label }: { label: string }) {
  const cls = label === "High" ? "border-good/25 bg-good/10 text-green-100" : label === "Medium" ? "border-amber-300/25 bg-amber-300/10 text-amber-100" : "border-risk/25 bg-risk/10 text-orange-100";
  return <span className={`rounded border px-2 py-0.5 text-[0.65rem] font-semibold ${cls}`}>{label} Confidence</span>;
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel-soft p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function BarList({ rows, empty, color = "cyan" }: { rows: Array<{ label: string; value: number; unit: string }>; empty: string; color?: "cyan" | "risk" | "good" }) {
  const visible = rows.filter((row) => Number.isFinite(row.value) && row.value > 0);
  if (!visible.length) return <p className="rounded-lg border border-dashed border-cyan-200/20 bg-ink-950/45 p-4 text-sm text-cyan-100/55">{empty}</p>;
  const colorClass = color === "risk" ? "bg-risk" : color === "good" ? "bg-good" : "bg-cyanline";
  return (
    <div className="grid gap-3">
      {visible.slice(0, 8).map((row) => (
        <div key={row.label} className="grid gap-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-cyan-100/65">{row.label}</span>
            <span className="font-semibold text-white">{row.value}{row.unit}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-950">
            <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${Math.min(100, row.value)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-cyan-200/10 bg-ink-950/45 px-3 py-2 text-sm">
      <span className="text-cyan-100/55">{label}</span>
      <span className="font-semibold text-white">{value > 0 ? currency(value) : "Pending input"}</span>
    </div>
  );
}

function AuditTrailPanel({ scenario }: { scenario: Scenario }) {
  const entries = scenario.auditTrail.slice(0, 8);
  return (
    <section className="panel-soft p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Audit Trail</h3>
          <p className="mt-1 text-xs text-cyan-100/52">Traceability for data edits, change reasons, and recommendation movement.</p>
        </div>
        <span className="rounded-md border border-cyanline/25 bg-cyanline/10 px-2 py-1 text-xs text-cyan-100">{entries.length} recent events</span>
      </div>
      {!entries.length ? (
        <p className="mt-4 rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3 text-sm text-cyan-100/55">No audit events yet. The next saved data change will appear here.</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {entries.map((entry) => (
            <article key={entry.id} className="rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{entry.change}</p>
                <span className="text-xs text-cyan-100/42">{compactDateTime(entry.at)}</span>
              </div>
              <div className="mt-2 grid gap-2 text-xs leading-5 md:grid-cols-2">
                <div className="rounded-md border border-cyan-200/10 bg-white/[0.025] px-2 py-2">
                  <span className="font-semibold text-cyan-100/70">Why</span>
                  <p className="mt-1 text-cyan-100/56">{entry.reason}</p>
                </div>
                <div className="rounded-md border border-cyan-200/10 bg-white/[0.025] px-2 py-2">
                  <span className="font-semibold text-cyan-100/70">Recommendation Impact</span>
                  <p className="mt-1 text-cyan-100/56">{entry.recommendationImpact}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
