import { CalendarClock, GitCompare, LineChart, Settings2, TrendingUp } from "lucide-react";
import type { OptimizationGoal, PredictionResult, Scenario, ScenarioComparisonRow, WeightSettings } from "../logic/types";
import EmptyState from "./EmptyState";
import ForecastPanel from "./ForecastPanel";
import ScenarioComparison from "./ScenarioComparison";
import WeightSliderPanel from "./WeightSliderPanel";
import { currency, pct } from "./format";

interface ForecastScenariosTabProps {
  scenario: Scenario;
  prediction: PredictionResult;
  comparisonRows: ScenarioComparisonRow[];
  onEditForecast: () => void;
  onChangeGoal: (goal: OptimizationGoal) => void;
  onChangeWeights: (weights: WeightSettings) => void;
}

export default function ForecastScenariosTab({ scenario, prediction, comparisonRows, onEditForecast, onChangeGoal, onChangeWeights }: ForecastScenariosTabProps) {
  const completeEnough = prediction.activeSupplierCount > 0 && prediction.totalDemand > 0 && prediction.activeRouteCount > 0 && prediction.confidenceScore >= 60;
  const lastPoint = prediction.forecast[prediction.forecast.length - 1];

  return (
    <section className="grid gap-4 animate-tab-in xl:grid-cols-[minmax(0,1fr)_25rem]">
      <div className="grid gap-4">
        <div className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Forecast & Scenarios</h2>
              <p className="mt-1 text-sm text-cyan-100/55">Forward projection, scenario comparisons, and optimization weights.</p>
            </div>
            <button className="btn btn-primary" type="button" onClick={onEditForecast}>
              <Settings2 size={16} />
              Edit Forecast Assumptions
            </button>
          </div>
        </div>

        {!completeEnough && (
          <EmptyState
            title="Forecast is incomplete until the sourcing network has enough inputs."
            body="Add suppliers, demand hubs, active routes, cost, capacity, demand, lead time, and risk assumptions to generate a trustworthy forecast."
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          <ForecastKpi label="Horizon" value={`${scenario.horizonDays} days`} detail="Selected scenario window" icon={CalendarClock} />
          <ForecastKpi label="Projected Cost" value={completeEnough && lastPoint ? currency(lastPoint.cost) : "Pending"} detail="At horizon end" icon={TrendingUp} />
          <ForecastKpi label="Projected Service" value={completeEnough && lastPoint ? pct(lastPoint.serviceLevel) : "Pending"} detail="At horizon end" icon={LineChart} />
          <ForecastKpi label="Scenario Rows" value={completeEnough ? String(comparisonRows.length) : "Pending"} detail="Generated from current network" icon={GitCompare} />
        </div>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_26rem]">
          <ForecastPanel prediction={prediction} />
          <section className="panel-soft p-4">
            <h3 className="text-sm font-semibold text-white">Forecast Assumptions</h3>
            <p className="mt-1 text-xs text-cyan-100/52">Planning assumptions applied to the local projection engine.</p>
            <div className="mt-4 grid gap-2 text-sm text-cyan-100/70">
              <Assumption label="Demand Growth" value={`${scenario.forecastAssumptions.demandGrowthPct}%`} />
              <Assumption label="Cost Inflation" value={`${scenario.forecastAssumptions.costInflationPct}%`} />
              <Assumption label="Risk Trend" value={`${scenario.forecastAssumptions.riskTrendPct} pts`} />
              <Assumption label="Service Drift" value={`${scenario.forecastAssumptions.serviceDriftPct} pts`} />
              <div className="rounded-lg border border-cyan-200/10 bg-ink-950/45 p-3">
                <p className="text-xs text-cyan-100/45">Seasonality Notes</p>
                <p className="mt-1 text-sm leading-5 text-white">{scenario.forecastAssumptions.seasonalityNotes || "No notes entered."}</p>
              </div>
            </div>
          </section>
        </div>

        <ScenarioComparison rows={completeEnough ? comparisonRows : []} />
      </div>

      <aside className="grid content-start gap-4">
        <WeightSliderPanel goal={scenario.optimizationGoal} weights={scenario.weights} onChangeGoal={onChangeGoal} onChangeWeights={onChangeWeights} />
        <section className="panel-soft p-4">
          <h3 className="text-sm font-semibold text-white">Scenario Readiness</h3>
          <div className="mt-3 grid gap-2 text-xs">
            <ReadinessRow label="Suppliers" ready={scenario.suppliers.length > 0} />
            <ReadinessRow label="Demand Hubs" ready={scenario.demandHubs.length > 0} />
            <ReadinessRow label="Active Routes" ready={scenario.routes.some((route) => route.active)} />
            <ReadinessRow label="Confidence 60%+" ready={prediction.confidenceScore >= 60} />
          </div>
        </section>
      </aside>
    </section>
  );
}

function ForecastKpi({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof CalendarClock }) {
  return (
    <article className="panel-soft p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-cyan-100/52">{label}</p>
          <p className="mt-1 text-xl font-semibold text-white">{value}</p>
          <p className="mt-1 text-xs text-cyan-100/42">{detail}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-cyanline/25 bg-cyanline/10 text-cyanline shadow-glow">
          <Icon size={17} />
        </div>
      </div>
    </article>
  );
}

function Assumption({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-cyan-200/10 bg-ink-950/45 px-3 py-2">
      <span className="text-cyan-100/50">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function ReadinessRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-cyan-200/10 bg-ink-950/45 px-2 py-2 text-cyan-100/62">
      <span>{label}</span>
      <span className={ready ? "font-semibold text-good" : "font-semibold text-risk"}>{ready ? "Ready" : "Missing"}</span>
    </div>
  );
}
