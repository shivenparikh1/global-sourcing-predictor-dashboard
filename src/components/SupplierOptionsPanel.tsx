import { Plus, Search } from "lucide-react";
import { getSupplierRiskEvents } from "../logic/predictionEngine";
import type { PredictionResult, Scenario, Supplier } from "../logic/types";
import EmptyState from "./EmptyState";
import SupplierCard from "./SupplierCard";

interface SupplierOptionsPanelProps {
  scenario: Scenario;
  prediction: PredictionResult;
  selectedSupplierId: string;
  onSelectSupplier: (id: string) => void;
  onEditSupplier: (supplier: Supplier) => void;
  onChangeSupplier: (supplier: Supplier) => void;
  onAddSupplier: () => void;
}

export default function SupplierOptionsPanel({
  scenario,
  prediction,
  selectedSupplierId,
  onSelectSupplier,
  onEditSupplier,
  onChangeSupplier,
  onAddSupplier,
}: SupplierOptionsPanelProps) {
  const activeRiskCount = scenario.riskEvents.filter((risk) => risk.active).length;

  return (
    <aside className="panel flex min-h-0 flex-col p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Supplier Options</h2>
          <p className="text-xs text-cyan-100/50">{activeRiskCount} active risk events in model</p>
        </div>
        <button className="btn btn-primary px-2" type="button" onClick={onAddSupplier} title="Add supplier">
          <Plus size={16} />
        </button>
      </div>
      <div className="mb-3 flex items-center gap-2 rounded-md border border-cyan-200/10 bg-ink-950/50 px-3 py-2 text-sm text-cyan-100/50">
        <Search size={16} />
        Editable supplier portfolio
      </div>
      {!scenario.suppliers.length && (
        <EmptyState
          title="No suppliers added yet."
          body="Add your first supplier to begin evaluating landed cost, lead time, risk, quality, ESG, and capacity."
          actionLabel="Add Supplier"
          onAction={onAddSupplier}
        />
      )}
      <div className="grid min-h-0 gap-3 overflow-auto pr-1">
        {scenario.suppliers.map((supplier) => {
          const supplierPrediction = prediction.suppliers.find((item) => item.supplierId === supplier.id);
          if (!supplierPrediction) return null;
          const activeRisks = getSupplierRiskEvents(scenario, supplier, supplier.transportMode);
          return (
            <div key={supplier.id}>
              <SupplierCard
                supplier={supplier}
                prediction={supplierPrediction}
                selected={selectedSupplierId === supplier.id}
                onSelect={() => onSelectSupplier(supplier.id)}
                onEdit={() => onEditSupplier(supplier)}
                onChange={onChangeSupplier}
              />
              {activeRisks.length > 0 && (
                <p className="mt-1 px-1 text-[0.68rem] text-orange-100/70">
                  Impacted by {activeRisks.map((risk) => risk.name).join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
