import { Download, RotateCcw, Save, Upload } from "lucide-react";
import { useRef } from "react";
import { appConfig } from "../appConfig";
import type { Scenario } from "../logic/types";

interface HeaderProps {
  scenario: Scenario;
  dashboardSlots: Scenario[];
  activeDashboardIndex: number;
  onSelectDashboard: (index: number) => void;
  onUpdateScenario: (scenario: Scenario) => void;
  onSaveScenario: () => void;
  onResetScenario: () => void;
  onResetExampleDashboard: () => void;
  onImportScenario: (file: File) => void;
  onExportScenario: () => void;
}

const horizonOptions = [30, 60, 90, 180] as const;

export default function Header({
  scenario,
  dashboardSlots,
  activeDashboardIndex,
  onSelectDashboard,
  onUpdateScenario,
  onSaveScenario,
  onResetScenario,
  onResetExampleDashboard,
  onImportScenario,
  onExportScenario,
}: HeaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const exampleIndex = dashboardSlots.length - 1;

  return (
    <header className="panel grid gap-2 px-3 py-2 2xl:grid-cols-[minmax(11rem,15rem)_minmax(0,1fr)] 2xl:items-end">
      <div className="min-w-0 pr-2 2xl:self-center">
        <h1 className="truncate text-lg font-semibold leading-6 text-white">{appConfig.appName}</h1>
      </div>

      <div className="flex w-full flex-wrap items-end gap-2 2xl:flex-nowrap">
        <div className="flex shrink-0 flex-col gap-1">
          <span className="label">Workspace Slots</span>
          <div className="flex items-center gap-1">
            <div className="flex gap-1 rounded-md border border-slate-500/20 bg-ink-950/55 p-0.5">
              {dashboardSlots.map((slot, index) => {
                const isExample = index === exampleIndex;
                return (
                  <button
                    key={`${slot.id}-${index}`}
                    className={`h-7 rounded border px-2 text-xs font-semibold transition ${isExample ? "min-w-[4.25rem]" : "w-7"} ${activeDashboardIndex === index ? "border-cyanline/50 bg-cyanline/[0.18] text-white shadow-glow" : "border-transparent text-slate-400 hover:bg-slate-400/[0.08] hover:text-white"}`}
                    type="button"
                    title={isExample ? "Example workspace" : slot.name || `Workspace ${index + 1}`}
                    onClick={() => onSelectDashboard(index)}
                  >
                    {isExample ? "Example" : index + 1}
                  </button>
                );
              })}
            </div>
            {activeDashboardIndex === exampleIndex && (
              <button className="btn h-8 px-2 text-xs" type="button" onClick={onResetExampleDashboard} title="Restart example workspace">
                <RotateCcw size={13} />
                Restart
              </button>
            )}
          </div>
        </div>

        <label className="flex min-w-48 flex-1 flex-col gap-1">
          <span className="label">Dashboard Name</span>
          <input className="input h-8 w-full px-2 py-1 text-xs" value={scenario.name} onChange={(event) => onUpdateScenario({ ...scenario, name: event.target.value })} />
        </label>

        <label className="flex shrink-0 flex-col gap-1">
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

        <div className="flex shrink-0 flex-wrap items-end gap-2 2xl:justify-end">
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
        </div>
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
      </div>
    </header>
  );
}
