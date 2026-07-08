import { Activity, AlertTriangle, BellRing, Clock, Plus, Radar, RadioTower, ShieldAlert, Zap } from "lucide-react";
import type { PredictionResult, RiskEvent, Scenario } from "../logic/types";
import EmptyState from "./EmptyState";
import RiskEventPanel from "./RiskEventPanel";

interface RiskIntelligenceTabProps {
  scenario: Scenario;
  prediction: PredictionResult;
  onUpdateScenario: (scenario: Scenario) => void;
  onAddRisk: () => void;
  onEditRisk: (risk: RiskEvent) => void;
  onChangeRisk: (risk: RiskEvent) => void;
}

export default function RiskIntelligenceTab({ scenario, prediction, onUpdateScenario, onAddRisk, onEditRisk, onChangeRisk }: RiskIntelligenceTabProps) {
  const activeRisks = scenario.riskEvents.filter((risk) => risk.active);
  const passiveRisks = scenario.riskEvents.filter((risk) => !risk.active);

  const simulateUpdate = () => {
    const existing = scenario.riskEvents[0];
    if (existing) {
      onUpdateScenario({
        ...scenario,
        riskEvents: scenario.riskEvents.map((risk) =>
          risk.id === existing.id
            ? {
                ...risk,
                active: true,
                severity: Math.min(100, Math.max(35, risk.severity + 12)),
                confidenceLevel: Math.min(100, Math.max(55, risk.confidenceLevel + 10)),
                description: risk.description || "Simulated update: risk signal strengthened during manual monitoring.",
              }
            : risk,
        ),
      });
      return;
    }

    const simulated: RiskEvent = {
      id: `risk-sim-${Date.now()}`,
      name: "Simulated logistics disruption",
      description: "Simulated update created from the Risk Intelligence tab. Edit or delete it like any other manual risk event.",
      affectedCountries: [],
      affectedSupplierIds: [],
      affectedDemandHubIds: [],
      affectedModes: ["Sea"],
      costImpactPct: 3,
      freightImpactPct: 5,
      leadTimeImpactDays: 4,
      reliabilityImpactPct: 4,
      riskScoreImpact: 12,
      severity: 48,
      confidenceLevel: 68,
      probability: "Medium",
      durationDays: 30,
      active: true,
      coordinates: { x: 55, y: 44, lng: 18, lat: 2 },
    };
    onUpdateScenario({ ...scenario, riskEvents: [...scenario.riskEvents, simulated] });
  };

  return (
    <section className="grid gap-4 animate-tab-in xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="grid gap-4">
        <div className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Risk Intelligence</h2>
              <p className="mt-1 text-sm text-cyan-100/55">Manual and simulated risk updates tied to suppliers, countries, demand hubs, and transport modes.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn" type="button" onClick={simulateUpdate} data-testid="simulate-risk-update">
                <Zap size={16} />
                Simulate Update
              </button>
              <button className="btn btn-primary" type="button" onClick={onAddRisk}>
                <Plus size={16} />
                Add Risk Event
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <RiskKpi label="Active Risks" value={String(activeRisks.length)} detail={`${passiveRisks.length} inactive`} icon={ShieldAlert} tone={activeRisks.length ? "risk" : "good"} />
          <RiskKpi label="Weighted Network Risk" value={prediction.confidenceScore >= 60 ? prediction.weightedRisk.toFixed(1) : "Pending"} detail="Requires complete network" icon={Radar} tone="cyan" />
          <RiskKpi label="Risk Warnings" value={String(prediction.warnings.length)} detail="From prediction engine" icon={AlertTriangle} tone={prediction.warnings.length ? "risk" : "good"} />
          <RiskKpi label="Confidence" value={`${prediction.confidenceScore}%`} detail={`${prediction.missingDataFields.length} missing fields`} icon={Activity} tone={prediction.confidenceScore >= 60 ? "good" : "risk"} />
        </div>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="panel-soft p-4">
            <h3 className="text-sm font-semibold text-white">Event Feed</h3>
            <p className="mt-1 text-xs text-cyan-100/52">Only manually entered or simulated events appear here.</p>
            {!scenario.riskEvents.length ? (
              <div className="mt-4">
                <EmptyState title="No risk feed activity yet." body="Add or simulate a risk event to start monitoring disruption signals." actionLabel="Add Risk Event" onAction={onAddRisk} />
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {scenario.riskEvents.map((risk) => (
                  <article key={risk.id} className={`rounded-lg border p-3 ${risk.active ? "border-risk/30 bg-risk/10" : "border-cyan-200/10 bg-white/[0.025]"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${risk.active ? "bg-risk shadow-[0_0_16px_rgba(255,107,58,.65)]" : "bg-cyan-100/30"}`} />
                          <h4 className="truncate text-sm font-semibold text-white">{risk.name || "Unnamed risk event"}</h4>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-cyan-100/58">{risk.description || "No description entered."}</p>
                      </div>
                      <button className="btn px-2" type="button" onClick={() => onEditRisk(risk)}>
                        Edit
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                      <FeedStat label="Probability" value={risk.probability} />
                      <FeedStat label="Severity" value={risk.severity ? risk.severity.toFixed(0) : "Missing"} />
                      <FeedStat label="Lead Impact" value={risk.leadTimeImpactDays ? `+${risk.leadTimeImpactDays}d` : "None"} />
                      <FeedStat label="Confidence" value={risk.confidenceLevel ? `${risk.confidenceLevel}%` : "Missing"} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel-soft p-4">
            <div className="flex items-center gap-2">
              <RadioTower size={17} className="text-cyanline" />
              <h3 className="text-sm font-semibold text-white">Simulated Updates</h3>
            </div>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-cyan-100/65">
              <p>The simulator creates local, editable risk records. It does not fetch external news or preload hidden events.</p>
              <div className="rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3">
                <p className="text-xs font-semibold uppercase text-cyan-100/45">Latest signal</p>
                <p className="mt-1 text-white">{scenario.riskEvents[0]?.name || "No simulated or manual signal yet"}</p>
              </div>
              <div className="rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3">
                <p className="text-xs font-semibold uppercase text-cyan-100/45">Watch window</p>
                <p className="mt-1 text-white">{scenario.horizonDays} days</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="grid content-start gap-4">
        <RiskEventPanel risks={scenario.riskEvents} onChangeRisk={onChangeRisk} onEditRisk={onEditRisk} onAddRisk={onAddRisk} />
        <section className="panel-soft p-4">
          <div className="flex items-center gap-2">
            <BellRing size={17} className="text-cyanline" />
            <h3 className="text-sm font-semibold text-white">Alert Rules</h3>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-cyan-100/62">
            <RuleRow label="Severity" value="Flag at 65+" />
            <RuleRow label="Lead Impact" value="Flag at +5 days" />
            <RuleRow label="Confidence" value="Escalate at 70%+" />
            <RuleRow label="Duration" value="Review over 60 days" />
          </div>
        </section>
      </div>
    </section>
  );
}

function RiskKpi({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: typeof Clock; tone: "cyan" | "risk" | "good" }) {
  const toneClass = tone === "risk" ? "text-risk border-risk/25 bg-risk/10" : tone === "good" ? "text-good border-good/25 bg-good/10" : "text-cyanline border-cyanline/25 bg-cyanline/10";
  return (
    <article className="panel-soft p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-cyan-100/52">{label}</p>
          <p className="mt-1 text-xl font-semibold text-white">{value}</p>
          <p className="mt-1 text-xs text-cyan-100/42">{detail}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-md border ${toneClass}`}>
          <Icon size={17} />
        </div>
      </div>
    </article>
  );
}

function FeedStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-cyan-200/10 bg-ink-950/45 px-2 py-1.5">
      <p className="text-cyan-100/40">{label}</p>
      <p className="font-semibold text-cyan-50">{value}</p>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-cyan-200/10 bg-ink-950/45 px-2 py-2">
      <span>{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
