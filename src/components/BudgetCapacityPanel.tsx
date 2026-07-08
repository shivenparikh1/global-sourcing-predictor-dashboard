import { CalendarDays, Target } from "lucide-react";
import type { BudgetConstraints } from "../logic/types";
import NumberInput from "./NumberInput";

interface BudgetCapacityPanelProps {
  budget: BudgetConstraints;
  onChange: (budget: BudgetConstraints) => void;
}

const numericFields: Array<[keyof BudgetConstraints, string, string]> = [
  ["monthlyDemand", "Monthly Demand", "units"],
  ["budget", "Budget", "USD"],
  ["maxAverageLeadTime", "Max Avg Lead Time", "days"],
  ["minServiceLevel", "Min Service Level", "%"],
  ["maxSupplierAllocation", "Max Supplier Allocation", "%"],
  ["minEsgScore", "Min ESG Target", "score"],
  ["safetyStockTarget", "Safety Stock Target", "days"],
  ["currentInventory", "Current Inventory", "units"],
];

export default function BudgetCapacityPanel({ budget, onChange }: BudgetCapacityPanelProps) {
  const updateNumber = (key: keyof BudgetConstraints, value: string) => {
    onChange({ ...budget, [key]: Number(value) });
  };

  return (
    <section className="panel-soft p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Budget & Capacity Inputs</h3>
          <p className="text-xs text-cyan-100/50">Constraints feeding prediction logic</p>
        </div>
        <Target className="text-cyanline" size={18} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {numericFields.map(([key, label, unit]) => (
          <label key={key} className="grid gap-1">
            <span className="text-xs text-cyan-100/70">{label}</span>
            <div className="flex overflow-hidden rounded-md border border-cyan-200/20 bg-ink-950/70">
              <NumberInput
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none"
                value={budget[key] as number}
                onChange={(value) => updateNumber(key, String(value))}
              />
              <span className="flex min-w-14 items-center justify-center border-l border-cyan-200/10 px-2 text-[0.68rem] text-cyan-100/50">{unit}</span>
            </div>
          </label>
        ))}
        <label className="grid gap-1 sm:col-span-2 xl:col-span-1">
          <span className="text-xs text-cyan-100/70">Target Delivery Date</span>
          <div className="flex items-center gap-2 rounded-md border border-cyan-200/20 bg-ink-950/70 px-3 py-2">
            <CalendarDays size={16} className="text-cyanline" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none"
              type="date"
              value={budget.targetDeliveryDate}
              onChange={(event) => onChange({ ...budget, targetDeliveryDate: event.target.value })}
            />
          </div>
        </label>
      </div>
    </section>
  );
}
