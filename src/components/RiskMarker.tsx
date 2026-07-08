import { AlertTriangle } from "lucide-react";
import type { MouseEvent } from "react";
import type { RiskEvent } from "../logic/types";

interface RiskMarkerProps {
  event: RiskEvent;
  onClick: () => void;
}

export default function RiskMarker({ event, onClick }: RiskMarkerProps) {
  if (!event.active) return null;
  const handleClick = (clickEvent: MouseEvent<HTMLButtonElement>) => {
    clickEvent.stopPropagation();
    onClick();
  };
  return (
    <button
      type="button"
      className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-md border border-risk/40 bg-risk/20 px-2 py-1 text-[0.66rem] font-semibold text-orange-100 shadow-glow backdrop-blur-md transition hover:bg-risk/25"
      style={{ left: `${event.coordinates.x}%`, top: `${(event.coordinates.y / 90) * 100}%` }}
      onClick={handleClick}
      title={event.name || "Risk event"}
    >
      <AlertTriangle size={13} />
      {event.probability}
    </button>
  );
}
