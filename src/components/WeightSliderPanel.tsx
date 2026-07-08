import { Scale } from "lucide-react";
import type { OptimizationGoal, WeightSettings } from "../logic/types";

interface WeightSliderPanelProps {
  goal: OptimizationGoal;
  weights: WeightSettings;
  onChangeGoal: (goal: OptimizationGoal) => void;
  onChangeWeights: (weights: WeightSettings) => void;
}

const goals: OptimizationGoal[] = ["Lowest cost", "Lowest risk", "Fastest lead time", "Best balanced", "Best ESG", "Highest resilience"];
const weightFields: Array<[keyof WeightSettings, string]> = [
  ["cost", "Cost"],
  ["leadTime", "Lead Time"],
  ["risk", "Risk"],
  ["reliability", "Reliability"],
  ["esg", "ESG"],
  ["capacity", "Capacity"],
  ["resilience", "Resilience"],
];

export default function WeightSliderPanel({ goal, weights, onChangeGoal, onChangeWeights }: WeightSliderPanelProps) {
  return (
    <section className="panel-soft p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Weights & Priorities</h3>
          <p className="text-xs text-cyan-100/50">Heuristic scoring controls</p>
        </div>
        <Scale className="text-cyanline" size={18} />
      </div>
      <label className="mb-3 grid gap-1">
        <span className="text-xs text-cyan-100/70">Optimization Goal</span>
        <select className="input" value={goal} onChange={(event) => onChangeGoal(event.target.value as OptimizationGoal)}>
          {goals.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <div className="grid max-h-64 gap-3 overflow-auto pr-1">
        {weightFields.map(([key, label]) => (
          <label key={key} className="grid gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-100/70">{label}</span>
              <span className="font-semibold text-slate-100">{weights[key]}</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={weights[key]}
              onChange={(event) => onChangeWeights({ ...weights, [key]: Number(event.target.value) })}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
