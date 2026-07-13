import { AlertTriangle, Bot, CheckCircle2, ClipboardList, Database, FileText, HelpCircle, ListChecks, PlayCircle, Radar, Route, Send, Settings2, ShieldCheck, Sparkles, Target, Wand2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { PredictionResult, Recommendation, Scenario } from "../logic/types";
import {
  answerCopilotQuestion,
  buildDataQuality,
  buildStrategyWarnings,
  buildWorkflowStages,
  deriveIntakeGuidance,
  getStrategyConfig,
  strategyOptions,
  suggestedCopilotQuestions,
  type IntakeState,
  type SourcingStrategy,
  type WorkflowStage,
} from "../logic/workflowIntelligence";
import type { AppTab } from "./TabNavigation";
import SmartNumberInput from "./NumberInput";

interface WorkflowCopilotTabProps {
  scenario: Scenario;
  prediction: PredictionResult;
  recommendation: Recommendation;
  strategy: SourcingStrategy;
  intake: IntakeState;
  onStrategyChange: (strategy: SourcingStrategy) => void;
  onIntakeApply: (intake: IntakeState) => void;
  onJumpToTab: (tab: AppTab) => void;
  onAddSupplier: () => void;
  onAddDemandHub: () => void;
  onAddRoute: () => void;
  onAddRisk: () => void;
  onAddLever: () => void;
  onEditForecast: () => void;
  onGenerateRecommendation: () => void;
}

export default function WorkflowCopilotTab({
  scenario,
  prediction,
  recommendation,
  strategy,
  intake,
  onStrategyChange,
  onIntakeApply,
  onJumpToTab,
  onAddSupplier,
  onAddDemandHub,
  onAddRoute,
  onAddRisk,
  onAddLever,
  onEditForecast,
  onGenerateRecommendation,
}: WorkflowCopilotTabProps) {
  const [draftIntake, setDraftIntake] = useState<IntakeState>(intake);
  const [question, setQuestion] = useState(suggestedCopilotQuestions[0]);
  const intakeRef = useRef<HTMLDivElement>(null);
  const quality = useMemo(() => buildDataQuality(scenario, prediction), [scenario, prediction]);
  const stages = useMemo(() => buildWorkflowStages(scenario, prediction, draftIntake), [scenario, prediction, draftIntake]);
  const guidance = useMemo(() => deriveIntakeGuidance(draftIntake), [draftIntake]);
  const strategyWarnings = useMemo(() => buildStrategyWarnings(scenario, prediction, strategy), [scenario, prediction, strategy]);
  const copilotAnswer = useMemo(() => answerCopilotQuestion(question, scenario, prediction, recommendation, quality, strategy), [question, scenario, prediction, recommendation, quality, strategy]);
  const compact = true;

  const runStageAction = (stage: WorkflowStage) => {
    if (stage.action === "intake") intakeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    else if (stage.action === "product") onJumpToTab("product");
    else if (stage.action === "supplier") onAddSupplier();
    else if (stage.action === "demand") onAddDemandHub();
    else if (stage.action === "route") onAddRoute();
    else if (stage.action === "risk") onAddRisk();
    else if (stage.action === "lever") onAddLever();
    else if (stage.action === "forecast") onJumpToTab("forecast");
    else if (stage.action === "recommendations") {
      onGenerateRecommendation();
      onJumpToTab("recommendations");
    } else if (stage.action === "reports") onJumpToTab("reports");
    else onJumpToTab("data");
  };

  return (
    <section className={`grid gap-4 animate-tab-in ${compact ? "xl:grid-cols-[minmax(0,1fr)_25rem]" : "xl:grid-cols-[minmax(0,1fr)_29rem]"}`}>
      <div className="grid gap-4">
        <div className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Workflow Copilot</h2>
              <p className="mt-1 text-sm text-cyan-100/55">Guided sourcing workflow, missing-data intelligence, strategy posture, and local Copilot answers.</p>
            </div>
          </div>
        </div>

        <section className="panel-soft p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Sourcing Strategy</h3>
              {!compact && <p className="mt-1 text-xs text-cyan-100/52">Changing strategy updates optimization weights and warning posture. It does not create fake records.</p>}
            </div>
            <span className="rounded-md border border-cyanline/25 bg-cyanline/10 px-2 py-1 text-xs text-cyan-100">{getStrategyConfig(strategy).goal}</span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 2xl:grid-cols-5">
            {strategyOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`rounded-md border px-3 py-2 text-left transition ${strategy === option.id ? "border-cyanline/50 bg-cyanline/15 text-white shadow-glow" : "border-cyan-200/10 bg-ink-950/45 text-cyan-100/68 hover:border-cyanline/35 hover:bg-cyanline/10"}`}
                onClick={() => onStrategyChange(option.id)}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                {!compact && <span className="mt-1 block text-xs leading-4 text-cyan-100/50">{option.description}</span>}
              </button>
            ))}
          </div>
          {strategyWarnings.length > 0 && (
            <div className="mt-3 grid gap-2">
              {strategyWarnings.map((warning) => (
                <div key={warning} className="rounded-md border border-risk/25 bg-risk/10 px-3 py-2 text-xs text-orange-100">
                  {warning}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <QualityCard icon={Target} label="Data Quality" value={`${quality.score}%`} detail={quality.explanation} tone={quality.reliable ? "good" : quality.band === "medium" ? "warn" : "risk"} />
          <QualityCard icon={ShieldCheck} label="Data Reliability" value={quality.reliable ? "Usable" : "Not ready"} detail={quality.reliable ? "Reliable enough for a decision draft." : "Use recommendations as guidance only."} tone={quality.reliable ? "good" : "risk"} />
          <QualityCard icon={Database} label="Missing Fields" value={String(quality.missingFields.length)} detail={quality.nextBestAction} tone={quality.missingFields.length ? "warn" : "good"} />
          <QualityCard icon={Radar} label="Strategy Warnings" value={String(strategyWarnings.length)} detail={strategyWarnings[0] || "No strategy-specific warning."} tone={strategyWarnings.length ? "risk" : "good"} />
        </section>

        <section className="panel-soft p-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={17} className="text-cyanline" />
            <h3 className="text-sm font-semibold text-white">Sourcing Workflow Tracker</h3>
          </div>
          <div className={`mt-4 grid gap-3 ${compact ? "xl:grid-cols-2" : ""}`}>
            {stages.map((stage, index) => (
              <StageRow key={stage.id} index={index + 1} stage={stage} compact={compact} onAction={() => runStageAction(stage)} />
            ))}
          </div>
        </section>
      </div>

      <aside className="grid content-start gap-4">
        <MissingPanel quality={quality} compact={compact} />
        <div ref={intakeRef}>
          <IntakeWizard draft={draftIntake} compact={compact} guidance={guidance} onChange={setDraftIntake} onApply={() => onIntakeApply(draftIntake)} onEditForecast={onEditForecast} />
        </div>
        <AskCopilotPanel question={question} answer={copilotAnswer} onQuestion={setQuestion} />
      </aside>
    </section>
  );
}

function StageRow({ index, stage, compact, onAction }: { index: number; stage: WorkflowStage; compact: boolean; onAction: () => void }) {
  const icon = stage.status === "complete" ? CheckCircle2 : stage.status === "warning" ? AlertTriangle : HelpCircle;
  const statusClass = stage.status === "complete" ? "border-good/25 bg-good/10 text-green-100" : stage.status === "warning" ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-risk/25 bg-risk/10 text-orange-100";
  const Icon = icon;
  return (
    <article className="rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${statusClass}`}>
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-cyan-100/42">Stage {index}</p>
            <h4 className="text-sm font-semibold text-white">{stage.title}</h4>
            <p className="mt-2 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-cyan-100/38">Why It Matters</p>
            <p className="mt-1 text-xs leading-5 text-cyan-100/55">{stage.whyItMatters}</p>
          </div>
        </div>
        <span className={`rounded border px-2 py-1 text-[0.68rem] font-semibold uppercase ${statusClass}`}>{stage.status}</span>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-cyan-100/62">
        {!compact && <InfoLine label="Required" value={stage.requiredInputs.join(", ")} />}
        <InfoLine label="Missing" value={stage.missingInputs.length ? stage.missingInputs.join(", ") : "None"} />
        <InfoLine label="Next" value={stage.nextBestAction} />
      </div>
      <button className="btn btn-primary mt-3 w-full" type="button" onClick={onAction}>
        <PlayCircle size={16} />
        {stage.actionLabel}
      </button>
    </article>
  );
}

function MissingPanel({ quality, compact }: { quality: ReturnType<typeof buildDataQuality>; compact: boolean }) {
  return (
    <section className="panel-soft p-4">
      <div className="flex items-center gap-2">
        <ListChecks size={17} className="text-cyanline" />
        <h3 className="text-sm font-semibold text-white">What's Missing?</h3>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-cyan-100/58">Estimated Confidence</span>
          <span className="font-semibold text-white">{quality.score}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-950">
          <div className={`h-full rounded-full ${quality.reliable ? "bg-good" : quality.band === "medium" ? "bg-amber-300" : "bg-risk"}`} style={{ width: `${quality.score}%` }} />
        </div>
        {!compact && <p className="mt-2 text-xs leading-5 text-cyan-100/52">{quality.explanation}</p>}
      </div>
      <div className="mt-4 grid gap-2">
        {quality.checks.map((check) => (
          <div key={check.key} className="flex items-start gap-2 rounded-md border border-cyan-200/10 bg-ink-950/45 px-2 py-2 text-xs">
            {check.complete ? <CheckCircle2 size={15} className="mt-0.5 text-good" /> : <AlertTriangle size={15} className="mt-0.5 text-risk" />}
            <div>
              <p className="font-semibold text-cyan-50">{check.label}</p>
              {!check.complete && <p className="mt-0.5 text-cyan-100/48">{check.fix}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function IntakeWizard({
  draft,
  compact,
  guidance,
  onChange,
  onApply,
  onEditForecast,
}: {
  draft: IntakeState;
  compact: boolean;
  guidance: ReturnType<typeof deriveIntakeGuidance>;
  onChange: (draft: IntakeState) => void;
  onApply: () => void;
  onEditForecast: () => void;
}) {
  const update = <K extends keyof IntakeState>(key: K, value: IntakeState[K]) => onChange({ ...draft, [key]: value });
  return (
    <section className="panel-soft p-4">
      <div className="flex items-center gap-2">
        <Wand2 size={17} className="text-cyanline" />
        <h3 className="text-sm font-semibold text-white">Sourcing Intake Wizard</h3>
      </div>
      {!compact && <p className="mt-1 text-xs leading-5 text-cyan-100/52">Optional setup only. It configures weights, constraints, notes, and next steps without creating supplier or demand records.</p>}
      <div className="mt-4 grid gap-3">
        <TextInput label="Product Category" value={draft.productCategory} onChange={(value) => update("productCategory", value)} />
        <div className="grid gap-2 sm:grid-cols-2">
          <NumberEntry label="Monthly Demand" value={draft.monthlyDemand} onChange={(value) => update("monthlyDemand", value)} />
          <NumberEntry label="Max Lead Time" value={draft.maxLeadTime} onChange={(value) => update("maxLeadTime", value)} />
        </div>
        <NumberEntry label="Budget" value={draft.budget} onChange={(value) => update("budget", value)} />
        <TextInput label="Customer Demand Regions" value={draft.demandRegions} onChange={(value) => update("demandRegions", value)} />
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-cyan-100/75">What Matters Most?</span>
          <select className="input" value={draft.priority} onChange={(event) => update("priority", event.target.value as IntakeState["priority"])}>
            <option value="cost">Cost</option>
            <option value="speed">Speed</option>
            <option value="risk">Risk</option>
            <option value="esg">ESG</option>
            <option value="resilience">Resilience</option>
            <option value="balanced">Balanced</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-cyan-100/75">Sourcing Motion</span>
          <select className="input" value={draft.sourcingMotion} onChange={(event) => update("sourcingMotion", event.target.value as IntakeState["sourcingMotion"])}>
            <option value="single sourcing">Single Sourcing</option>
            <option value="dual sourcing">Dual Sourcing</option>
            <option value="nearshoring">Nearshoring</option>
            <option value="resourcing">Resourcing</option>
            <option value="emergency sourcing">Emergency Sourcing</option>
            <option value="new product sourcing">New Product Sourcing</option>
          </select>
        </label>
        <TextInput label="Preferred Regions" value={draft.preferredRegions} onChange={(value) => update("preferredRegions", value)} />
        <TextInput label="Allowed Regions" value={draft.allowedRegions} onChange={(value) => update("allowedRegions", value)} />
        <TextInput label="Restricted Regions" value={draft.restrictedRegions} onChange={(value) => update("restrictedRegions", value)} />
        <TextInput label="Risk Concerns" value={draft.riskConcerns} onChange={(value) => update("riskConcerns", value)} />
      </div>
      {!compact && (
        <div className="mt-4 grid gap-2 text-xs text-cyan-100/58">
          <InfoBlock title="Required Input Checklist" items={guidance.checklist} />
          <InfoBlock title="Recommended Next Steps" items={guidance.nextSteps} />
          <InfoBlock title="Visible Assumptions" items={guidance.assumptions} />
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn btn-primary" type="button" onClick={onApply}>
          <Send size={16} />
          Apply Intake
        </button>
        <button className="btn" type="button" onClick={onEditForecast}>
          <Settings2 size={16} />
          Edit Forecast
        </button>
      </div>
    </section>
  );
}

function AskCopilotPanel({ question, answer, onQuestion }: { question: string; answer: string; onQuestion: (question: string) => void }) {
  return (
    <section className="panel-soft p-4">
      <div className="flex items-center gap-2">
        <Bot size={17} className="text-cyanline" />
        <h3 className="text-sm font-semibold text-white">Ask Copilot</h3>
      </div>
      <div className="mt-3 grid gap-2">
        <select className="input" value={question} onChange={(event) => onQuestion(event.target.value)}>
          {suggestedCopilotQuestions.map((item) => <option key={item}>{item}</option>)}
        </select>
        <div className="rounded-lg border border-cyanline/20 bg-cyanline/[0.055] p-3 text-sm leading-6 text-cyan-50/[0.82]">
          {answer}
        </div>
      </div>
    </section>
  );
}

function QualityCard({ icon: Icon, label, value, detail, tone }: { icon: LucideIcon; label: string; value: string; detail: string; tone: "good" | "warn" | "risk" }) {
  const toneClass = tone === "good" ? "border-good/25 bg-good/10 text-green-100" : tone === "warn" ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-risk/25 bg-risk/10 text-orange-100";
  return (
    <article className="panel-soft p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-cyan-100/52">{label}</p>
          <p className="mt-1 text-xl font-semibold text-white">{value}</p>
          <p className="mt-1 line-clamp-2 text-xs text-cyan-100/42">{detail}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-md border ${toneClass}`}>
          <Icon size={17} />
        </div>
      </div>
    </article>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <span className="font-semibold text-cyan-100/42">{label}</span>
      <span className="text-cyan-50/[0.78]">{value}</span>
    </div>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3">
      <p className="font-semibold text-cyan-50">{title}</p>
      <div className="mt-2 grid gap-1">
        {items.map((item) => <p key={item}>- {item}</p>)}
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-cyan-100/75">{label}</span>
      <input className="input" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberEntry({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-cyan-100/75">{label}</span>
      <SmartNumberInput className="input" min={0} value={value} onChange={onChange} />
    </label>
  );
}
