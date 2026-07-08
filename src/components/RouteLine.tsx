import type { MouseEvent } from "react";
import type { Route, TransportMode } from "../logic/types";

interface RouteLineProps {
  route: Route;
  selected: boolean;
  mode: TransportMode;
  onClick: () => void;
}

const modeStroke: Record<TransportMode, string> = {
  Sea: "#23d3ee",
  Air: "#8bdcff",
  Land: "#33d17a",
  Multimodal: "#f4b94f",
};

const modeDash: Record<TransportMode, string | undefined> = {
  Sea: undefined,
  Air: "4 4",
  Land: "1 4",
  Multimodal: "8 3 2 3",
};

export default function RouteLine({ route, mode, selected, onClick }: RouteLineProps) {
  const control = route.via ?? { x: (route.from.x + route.to.x) / 2, y: Math.min(route.from.y, route.to.y) - 12 };
  const path = `M ${route.from.x} ${route.from.y} Q ${control.x} ${control.y} ${route.to.x} ${route.to.y}`;
  const handleClick = (event: MouseEvent<SVGGElement>) => {
    event.stopPropagation();
    onClick();
  };
  return (
    <g className="cursor-pointer" onClick={handleClick} role="button" aria-label={`Route from ${route.originLabel || "origin"}`}>
      <path d={path} fill="none" stroke={modeStroke[mode]} strokeOpacity={selected ? 0.92 : 0.32} strokeWidth={selected ? 0.95 : 0.55} strokeLinecap="round" />
      <path
        d={path}
        fill="none"
        stroke={modeStroke[mode]}
        strokeOpacity={selected ? 0.92 : 0.65}
        strokeWidth={selected ? 0.85 : 0.45}
        strokeDasharray={modeDash[mode]}
        strokeLinecap="round"
        className="animate-dash-flow"
      />
      <path d={path} fill="none" stroke="transparent" strokeWidth="4" />
    </g>
  );
}
