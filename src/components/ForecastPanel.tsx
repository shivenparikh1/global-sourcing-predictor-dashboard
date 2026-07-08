import { LineChart } from "lucide-react";
import type { ForecastPoint, PredictionResult } from "../logic/types";
import { currency } from "./format";

export default function ForecastPanel({ prediction }: { prediction: PredictionResult }) {
  const lastPoint = prediction.forecast[prediction.forecast.length - 1];

  return (
    <section className="panel-soft p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Forecast View</h3>
          <p className="text-xs text-cyan-100/50">30/60/90/180 day projection</p>
        </div>
        <LineChart className="text-cyanline" size={18} />
      </div>
      <div className="rounded-lg border border-cyan-200/10 bg-ink-950/50 p-2">
        <ForecastSvg points={prediction.forecast} />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-[0.68rem]">
        <Stat label="Cost" value={currency(lastPoint?.cost ?? prediction.totalScenarioCost)} />
        <Stat label="Risk" value={(lastPoint?.risk ?? prediction.weightedRisk).toFixed(1)} />
        <Stat label="Lead" value={`${(lastPoint?.leadTime ?? prediction.avgLeadTime).toFixed(1)}d`} />
        <Stat label="Service" value={`${(lastPoint?.serviceLevel ?? prediction.serviceLevel).toFixed(1)}%`} />
      </div>
    </section>
  );
}

function ForecastSvg({ points }: { points: ForecastPoint[] }) {
  const width = 360;
  const height = 160;
  const pad = 24;
  const xFor = (index: number) => pad + (index / Math.max(1, points.length - 1)) * (width - pad * 2);
  const lineFor = (key: keyof ForecastPoint, color: string, invert = false) => {
    const values = points.map((point) => Number(point[key]));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const yFor = (value: number) => {
      const normalized = max === min ? 0.5 : (value - min) / (max - min);
      const plotted = invert ? normalized : 1 - normalized;
      return pad + plotted * (height - pad * 2);
    };
    const d = points.map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(Number(point[key]))}`).join(" ");
    return <path key={String(key)} d={d} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />;
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full">
      <defs>
        <linearGradient id="forecastFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#23d3ee" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#23d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} rx="8" fill="url(#forecastFill)" />
      {[0, 1, 2, 3].map((tick) => (
        <line key={tick} x1={pad} x2={width - pad} y1={pad + tick * 34} y2={pad + tick * 34} stroke="#8bdcff" strokeOpacity="0.1" />
      ))}
      {lineFor("cost", "#23d3ee")}
      {lineFor("risk", "#ff6b3a")}
      {lineFor("leadTime", "#f4b94f")}
      {lineFor("serviceLevel", "#33d17a")}
      {points.map((point, index) => (
        <g key={point.day}>
          <line x1={xFor(index)} x2={xFor(index)} y1={height - pad} y2={height - pad + 4} stroke="#8bdcff" strokeOpacity="0.4" />
          <text x={xFor(index)} y={height - 6} textAnchor="middle" fill="#9cc8d7" fontSize="10">
            {point.day}d
          </text>
        </g>
      ))}
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-cyan-200/10 bg-ink-950/50 p-2">
      <p className="text-cyan-100/40">{label}</p>
      <p className="font-semibold text-slate-100">{value}</p>
    </div>
  );
}
