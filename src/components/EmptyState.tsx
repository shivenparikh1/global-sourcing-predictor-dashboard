import { PlusCircle } from "lucide-react";

interface EmptyStateProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabledReason?: string;
}

export default function EmptyState({ title, body, actionLabel, onAction, actionDisabledReason }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-slate-500/20 bg-ink-950/40 p-3 text-sm">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 leading-5 text-slate-400">{body}</p>
      {actionLabel && onAction && (
        <>
          <button className="btn btn-primary mt-3 min-h-8 px-2.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-45" type="button" onClick={onAction} disabled={Boolean(actionDisabledReason)} title={actionDisabledReason || actionLabel}>
            <PlusCircle size={16} />
            {actionLabel}
          </button>
          {actionDisabledReason && <p className="mt-2 text-xs text-slate-500">{actionDisabledReason}</p>}
        </>
      )}
    </div>
  );
}
