import type { ReactNode } from "react";
import { GitCompareArrows } from "lucide-react";
import type { ScenarioComparisonRow } from "../logic/types";
import { currency, pct } from "./format";

export default function ScenarioComparison({ rows }: { rows: ScenarioComparisonRow[] }) {
  return (
    <section className="panel-soft overflow-hidden p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Scenario Comparison</h3>
          <p className="text-xs text-cyan-100/50">Current, recommended, cost, risk, and speed plans</p>
        </div>
        <GitCompareArrows className="text-cyanline" size={18} />
      </div>
      <div className="overflow-auto rounded-lg border border-cyan-200/10">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <thead className="bg-cyanline/10 text-cyan-100/70">
            <tr>
              <Th>Plan</Th>
              <Th>Total cost</Th>
              <Th>Avg unit</Th>
              <Th>Lead</Th>
              <Th>Risk</Th>
              <Th>Service</Th>
              <Th>ESG</Th>
              <Th>Resilience</Th>
              <Th>Capacity</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-t border-cyan-200/10 odd:bg-white/[0.018]">
                <Td strong>{row.name}</Td>
                <Td>{currency(row.totalCost)}</Td>
                <Td>{currency(row.avgLandedCost)}</Td>
                <Td>{row.avgLeadTime.toFixed(1)}d</Td>
                <Td>{row.riskScore.toFixed(1)}</Td>
                <Td>{pct(row.serviceLevel)}</Td>
                <Td>{row.esg.toFixed(0)}</Td>
                <Td>{row.resilience.toFixed(0)}</Td>
                <Td>{pct(row.capacityUtilization * 100)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-3 py-2 font-semibold">{children}</th>;
}

function Td({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return <td className={`whitespace-nowrap px-3 py-2 ${strong ? "font-semibold text-white" : "text-cyan-100/70"}`}>{children}</td>;
}
