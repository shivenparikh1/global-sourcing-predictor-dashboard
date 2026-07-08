import { BarChart3, Bot, Database, FileText, Lightbulb, Map, PackageSearch, Radar, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PredictionResult, Scenario } from "../logic/types";

export type AppTab = "command" | "workflow" | "product" | "data" | "metrics" | "risk" | "forecast" | "recommendations" | "reports";

interface TabNavigationProps {
  activeTab: AppTab;
  scenario: Scenario;
  prediction: PredictionResult;
  onChange: (tab: AppTab) => void;
}

const tabs: Array<{ id: AppTab; label: string; icon: LucideIcon }> = [
  { id: "command", label: "Command Map", icon: Map },
  { id: "workflow", label: "Workflow Copilot", icon: Bot },
  { id: "product", label: "Product Details", icon: PackageSearch },
  { id: "data", label: "Data Input", icon: Database },
  { id: "metrics", label: "Metrics", icon: BarChart3 },
  { id: "risk", label: "Risk Intelligence", icon: Radar },
  { id: "forecast", label: "Forecast & Scenarios", icon: TrendingUp },
  { id: "recommendations", label: "Recommendations", icon: Lightbulb },
  { id: "reports", label: "Reports", icon: FileText },
];

export default function TabNavigation({ activeTab, scenario, prediction, onChange }: TabNavigationProps) {
  const activeRisks = scenario.riskEvents.filter((risk) => risk.active).length;
  const productIncomplete = !scenario.productDetails.name && !scenario.productDetails.category && !scenario.productDetails.specification;
  const forecastIncomplete =
    !scenario.forecastAssumptions.demandGrowthPct &&
    !scenario.forecastAssumptions.costInflationPct &&
    !scenario.forecastAssumptions.riskTrendPct &&
    !scenario.forecastAssumptions.serviceDriftPct &&
    !scenario.forecastAssumptions.seasonalityNotes;
  const badges: Partial<Record<AppTab, { label: string; tone: "warn" | "risk" | "info" }>> = {
    workflow: prediction.missingDataFields.length ? { label: `${prediction.missingDataFields.length} missing`, tone: "warn" } : undefined,
    product: productIncomplete ? { label: "Incomplete", tone: "warn" } : undefined,
    data: prediction.missingDataFields.length ? { label: "Needs input", tone: "warn" } : undefined,
    risk: activeRisks ? { label: `${activeRisks} active`, tone: "risk" } : undefined,
    forecast: forecastIncomplete ? { label: "Incomplete", tone: "warn" } : undefined,
  };

  return (
    <nav className="panel overflow-x-auto px-1.5 py-1.5" aria-label="Primary workspace tabs" data-testid="top-tab-nav">
      <div className="flex min-w-max items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const badge = badges[tab.id];
            return (
              <button
                key={tab.id}
                data-testid={`tab-${tab.id}`}
                type="button"
                aria-selected={active}
                className={`group inline-flex min-h-9 items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-cyanline/45 bg-cyanline/[0.14] text-cyan-50 shadow-glow"
                    : "border-transparent text-slate-400 hover:border-slate-500/30 hover:bg-slate-400/[0.06] hover:text-slate-100"
                }`}
                onClick={() => onChange(tab.id)}
              >
                <Icon size={15} className={active ? "text-cyanline" : "text-slate-500 group-hover:text-slate-300"} />
                <span>{tab.label}</span>
                {badge && (
                  <span className={`rounded border px-1.5 py-0.5 text-[0.62rem] ${badge.tone === "risk" ? "border-risk/25 bg-risk/10 text-orange-100" : badge.tone === "warn" ? "border-amber-300/25 bg-amber-300/10 text-amber-100" : "border-cyanline/25 bg-cyanline/10 text-cyan-100"}`}>
                    {badge.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
