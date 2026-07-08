import { Download, RotateCcw, Save, Upload } from "lucide-react";
import { useRef } from "react";
import type { Scenario } from "../logic/types";
import { compactDateTime } from "./format";

interface HeaderProps {
  scenario: Scenario;
  savedScenarios: Scenario[];
  dashboardSlots: Scenario[];
  activeDashboardIndex: number;
  onSelectDashboard: (index: number) => void;
  onSelectScenario: (id: string) => void;
  onUpdateScenario: (scenario: Scenario) => void;
  onSaveScenario: () => void;
  onResetScenario: () => void;
  onImportScenario: (file: File) => void;
  onExportScenario: () => void;
}

const horizonOptions = [30, 60, 90, 180] as const;

export default function Header({
  scenario,
  savedScenarios,
  dashboardSlots,
  activeDashboardIndex,
  onSelectDashboard,
  onSelectScenario,
  onUpdateScenario,
  onSaveScenario,
  onResetScenario,
  onImportScenario,
  onExportScenario,
}: HeaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <header className="panel flex flex-col gap-2 px-3 py-2 2xl:flex-row 2xl:items-center 2xl:justify-between">
      <div className="min-w-0 pr-2">
        <h1 className="truncate text-lg font-semibold leading-6 text-white">Global Sourcing Predictor</h1>
        <p className="truncate text-[0.7rem] font-medium uppercase tracking-[0.12em] text-slate-400">Supplier Risk, Cost, Capacity & Logistics Intelligence</p>
      </div>

      <div className="flex w-full flex-wrap items-end gap-2 2xl:w-auto 2xl:justify-end">
        <div className="flex flex-col gap-1">
          <span className="label">Dashboards</span>
          <div className="flex gap-1 rounded-md border border-slate-500/20 bg-ink-950/55 p-0.5">
            {dashboardSlots.map((slot, index) => (
              <button
                key={`${slot.id}-${index}`}
                className={`h-7 w-7 rounded border text-xs font-semibold transition ${activeDashboardIndex === index ? "border-cyanline/50 bg-cyanline/[0.18] text-white shadow-glow" : "border-transparent text-slate-400 hover:bg-slate-400/[0.08] hover:text-white"}`}
                type="button"
                title={slot.name || `Dashboard ${index + 1}`}
                onClick={() => onSelectDashboard(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="label">Dashboard Name</span>
          <input className="input h-8 min-w-44 px-2 py-1 text-xs" value={scenario.name} onChange={(event) => onUpdateScenario({ ...scenario, name: event.target.value })} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="label">Saved Scenario</span>
          <select className="input h-8 min-w-44 px-2 py-1 text-xs" value={scenario.id} onChange={(event) => onSelectScenario(event.target.value)}>
            <option value={scenario.id}>{scenario.name}</option>
            {savedScenarios
              .filter((item) => item.id !== scenario.id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="label">Time Horizon</span>
          <select
            className="input h-8 min-w-28 px-2 py-1 text-xs"
            value={scenario.horizonDays}
            onChange={(event) => onUpdateScenario({ ...scenario, horizonDays: Number(event.target.value) as Scenario["horizonDays"] })}
          >
            {horizonOptions.map((days) => (
              <option key={days} value={days}>
                {days} days
              </option>
            ))}
          </select>
        </label>

        <button className="btn btn-primary min-h-8 px-2.5 py-1.5 text-xs" type="button" onClick={onSaveScenario} title="Save scenario">
          <Save size={14} />
          Save
        </button>
        <button className="btn min-h-8 px-2.5 py-1.5 text-xs" type="button" onClick={onResetScenario} title="Clear workspace">
          <RotateCcw size={14} />
          Clear Data
        </button>
        <button className="btn min-h-8 px-2.5 py-1.5 text-xs" type="button" onClick={() => fileRef.current?.click()} title="Import JSON">
          <Upload size={14} />
          Import JSON
        </button>
        <button className="btn min-h-8 px-2.5 py-1.5 text-xs" type="button" onClick={onExportScenario} title="Export JSON">
          <Download size={14} />
          Export JSON
        </button>
        <input
          ref={fileRef}
          className="hidden"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImportScenario(file);
            event.currentTarget.value = "";
          }}
        />
        <div className="min-w-32 pb-1 text-right text-[0.68rem] text-slate-500">
          <div className="font-semibold uppercase tracking-[0.12em]">Last Updated</div>
          <div className="font-medium text-slate-300">{compactDateTime(scenario.updatedAt)}</div>
        </div>
      </div>
    </header>
  );
}
