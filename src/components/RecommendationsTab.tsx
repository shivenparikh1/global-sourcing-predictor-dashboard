import { AlertTriangle, BarChart3, CheckCircle2, ClipboardCheck, Gauge, Leaf, ListChecks, RefreshCw, Route, ShieldQuestion, Sparkles, Target, Timer, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PredictionResult, Recommendation, Scenario } from "../logic/types";
import { buildDataQuality, buildRecommendationExplanation, buildStrategyWarnings, riskMitigationPlaybook, type SourcingStrategy } from "../logic/workflowIntelligence";
import EmptyState from "./EmptyState";
import RecommendationPanel from "./RecommendationPanel";
import WarningPanel from "./WarningPanel";
import { pct } from "./format";

interface RecommendationsTabProps {
  scenario: Scenario;
  prediction: PredictionResult;
  recommendation: Recommendation;
  strategy: SourcingStrategy;
  generatedAt: string;
  onGenerate: () => void;
  onApply: () => void;
}

export default function RecommendationsTab({ scenario, prediction, recommendation, strategy, generatedAt, onGenerate, onApply }: RecommendationsTabProps) {
  const completeEnough = prediction.activeSupplierCount > 0 && prediction.totalDemand > 0 && prediction.activeRouteCount > 0 && prediction.confidenceScore >= 60;
  const quality = buildDataQuality(scenario, prediction);
  const explanation = buildRecommendationExplanation(scenario, prediction, recommendation, strategy);
  const strategyWarnings = buildStrategyWarnings(scenario, prediction, strategy);
  const missing = Array.from(new Set([...quality.missingFields, ...prediction.missingDataFields])).slice(0, 10);

  return (
    <section className="grid gap-4 animate-tab-in xl:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="grid gap-4">
        <div className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Recommendations</h2>
              <p className="mt-1 text-sm text-cyan-100/55">Decision support with confidence, missing data, rationale, and recommended action.</p>
            </div>
            <button className="btn" type="button" onClick={onGenerate}>
              <RefreshCw size={16} />
              Refresh Recommendation
            </button>
          </div>
        </div>

        {!completeEnough && (
          <EmptyState
            title="Recommendation is intentionally cautious."
            body="The app can explain gaps now, but it will not treat the decision as high-confidence until supplier, demand, route, cost, capacity, and lead-time inputs are present."
          />
        )}

        <RecommendationPanel recommendation={recommendation} generatedAt={generatedAt} onGenerate={onGenerate} onApply={onApply} />

        <section className="panel-soft p-4">
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-cyanline" />
            <h3 className="text-sm font-semibold text-white">Explainable Recommendation</h3>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            <ExplainCard icon={ClipboardCheck} label="Decision" value={recommendation.finalDecision.toUpperCase()} detail={explanation.whySelected} />
            <ExplainCard icon={ListChecks} label="Best Lever" value={recommendation.bestLever || "Pending"} detail="Selected from entered negotiation levers and current network posture." />
            <ExplainCard icon={ShieldQuestion} label="Biggest Risk" value={recommendation.biggestRisk || "Pending"} detail="Derived from supplier, route, country, and active event risk inputs." />
            <ExplainCard icon={Target} label="Confidence" value={`${quality.score}% ${quality.band}`} detail={quality.explanation} />
          </div>

          <div className="mt-4 rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3">
            <h4 className="text-sm font-semibold text-white">Recommended Supplier Mix by Demand Hub</h4>
            <div className="mt-3 grid gap-2">
              {explanation.supplierMixByDemandHub.map((item) => (
                <div key={item} className="rounded-md border border-cyan-200/10 bg-white/[0.025] px-3 py-2 text-sm text-cyan-50/80">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            <ReasoningCard icon={BarChart3} title="Cost Reasoning" body={explanation.costReasoning} />
            <ReasoningCard icon={Timer} title="Lead-Time Reasoning" body={explanation.leadTimeReasoning} />
            <ReasoningCard icon={Gauge} title="Risk Reasoning" body={explanation.riskReasoning} />
            <ReasoningCard icon={Route} title="Service-Level Reasoning" body={explanation.serviceReasoning} />
            <ReasoningCard icon={Leaf} title="ESG Reasoning" body={explanation.esgReasoning} />
            <ReasoningCard icon={Zap} title="Resilience Reasoning" body={explanation.resilienceReasoning} />
          </div>

          <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3">
            <p className="text-sm font-semibold text-amber-100">Biggest Tradeoff</p>
            <p className="mt-1 text-sm leading-6 text-amber-50/80">{explanation.biggestTradeoff}</p>
          </div>
        </section>

        <section className="panel-soft p-4">
          <h3 className="text-sm font-semibold text-white">Risk Mitigation Playbook</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {riskMitigationPlaybook.slice(0, 6).map((item) => (
              <div key={item.category} className="rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3">
                <p className="text-sm font-semibold text-white">{item.category}</p>
                <p className="mt-2 text-xs leading-5 text-cyan-100/56">{item.mitigations.join("; ")}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="grid content-start gap-4">
        <section className="panel-soft p-4">
          <h3 className="text-sm font-semibold text-white">Confidence</h3>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-cyan-100/58">Data Completeness</span>
              <span className="font-semibold text-white">{pct(quality.score)}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-950">
              <div className={`h-full rounded-full ${quality.reliable ? "bg-good" : quality.band === "medium" ? "bg-amber-300" : "bg-risk"}`} style={{ width: `${quality.score}%` }} />
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-xs">
            <ConfidenceRow label="Supplier Records" ready={scenario.suppliers.length > 0} />
            <ConfidenceRow label="Demand Hubs" ready={scenario.demandHubs.length > 0} />
            <ConfidenceRow label="Active Route Lanes" ready={scenario.routes.some((route) => route.active)} />
            <ConfidenceRow label="Risk Assumptions" ready={scenario.riskEvents.length > 0 || scenario.regionalRiskProfiles.length > 0} />
          </div>
        </section>

        {strategyWarnings.length > 0 && (
          <section className="panel-soft p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={17} className="text-risk" />
              <h3 className="text-sm font-semibold text-white">Strategy Warnings</h3>
            </div>
            <div className="mt-3 grid gap-2">
              {strategyWarnings.map((warning) => (
                <div key={warning} className="rounded-md border border-risk/20 bg-risk/10 px-3 py-2 text-xs text-orange-100/85">
                  {warning}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="panel-soft p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={17} className="text-risk" />
            <h3 className="text-sm font-semibold text-white">Missing Data</h3>
          </div>
          {!missing.length ? (
            <p className="mt-3 rounded-lg border border-good/20 bg-good/10 p-3 text-sm text-green-100">No critical missing fields detected.</p>
          ) : (
            <div className="mt-3 grid gap-2">
              {missing.map((field) => (
                <div key={field} className="rounded-md border border-risk/20 bg-risk/10 px-3 py-2 text-xs text-orange-100/85">
                  {field}
                </div>
              ))}
              {prediction.missingDataFields.length > missing.length && <p className="text-xs text-cyan-100/45">+{prediction.missingDataFields.length - missing.length} more fields</p>}
            </div>
          )}
        </section>

        <WarningPanel prediction={prediction} />
      </aside>
    </section>
  );
}

function ExplainCard({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <article className="rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-cyanline" />
        <p className="text-xs text-cyan-100/48">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-cyan-100/56">{detail}</p>
    </article>
  );
}

function ReasoningCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <article className="rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-cyanline" />
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-cyan-100/56">{body}</p>
    </article>
  );
}

function ConfidenceRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-cyan-200/10 bg-ink-950/45 px-2 py-2 text-cyan-100/62">
      <span>{label}</span>
      <span className={ready ? "font-semibold text-good" : "font-semibold text-risk"}>{ready ? "Available" : "Missing"}</span>
    </div>
  );
}
