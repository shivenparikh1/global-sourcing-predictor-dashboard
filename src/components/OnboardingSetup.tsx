import { Boxes, MapPinned, Network, PlusCircle, Route, ShieldAlert, Sparkles, Target } from "lucide-react";
import type { Scenario } from "../logic/types";

interface OnboardingSetupProps {
  scenario: Scenario;
  onAddDemandHub: () => void;
  onAddSupplier: () => void;
  onAddRoute: () => void;
  onAddRisk: () => void;
  routeDisabledReason?: string;
}

const steps = [
  { label: "Add Demand Hubs and Customers", icon: MapPinned },
  { label: "Add Suppliers", icon: Boxes },
  { label: "Connect Suppliers to Demand Hubs", icon: Network },
  { label: "Add Routes and Transport Modes", icon: Route },
  { label: "Add Budget and Capacity Constraints", icon: Target },
  { label: "Add Risk Events", icon: ShieldAlert },
  { label: "Generate Prediction", icon: Sparkles },
];

export default function OnboardingSetup({ scenario, onAddDemandHub, onAddSupplier, onAddRoute, onAddRisk, routeDisabledReason }: OnboardingSetupProps) {
  const completeEnough = scenario.suppliers.length > 0 && scenario.demandHubs.length > 0 && scenario.routes.some((route) => route.active);
  if (completeEnough) return null;

  return (
    <section className="panel overflow-hidden p-5">
      <div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Build Your Global Sourcing Network</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-100/68">
            Add suppliers, customer demand locations, transportation lanes, risk events, and constraints to generate sourcing predictions.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button className="btn btn-primary justify-start" type="button" onClick={onAddDemandHub}>
              <PlusCircle size={16} />
              Add Demand Hub
            </button>
            <button className="btn btn-primary justify-start" type="button" onClick={onAddSupplier}>
              <PlusCircle size={16} />
              Add Supplier
            </button>
            <button className="btn justify-start disabled:cursor-not-allowed disabled:opacity-45" type="button" onClick={onAddRoute} disabled={Boolean(routeDisabledReason)} title={routeDisabledReason || "Create Route"}>
              <Route size={16} />
              Create Route
            </button>
            <button className="btn justify-start" type="button" onClick={onAddRisk}>
              <ShieldAlert size={16} />
              Add Risk Event
            </button>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="rounded-lg border border-cyan-200/10 bg-white/[0.025] p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-100/75">
                    <Icon size={15} className="text-cyanline" />
                    Step {index + 1}
                  </div>
                  <p className="mt-2 text-sm text-white">{step.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
