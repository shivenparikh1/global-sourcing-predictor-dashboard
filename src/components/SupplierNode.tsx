import type { MouseEvent } from "react";
import type { SupplierPrediction } from "../logic/types";
import { getRiskTag } from "../logic/predictionEngine";

interface SupplierNodeProps {
  prediction: SupplierPrediction;
  x: number;
  y: number;
  selected: boolean;
  onClick: () => void;
}

export default function SupplierNode({ prediction, x, y, selected, onClick }: SupplierNodeProps) {
  const riskTag = getRiskTag(prediction.riskScore);
  const fill = riskTag === "High Risk" ? "#ff6b3a" : riskTag === "Balanced" ? "#f4b94f" : "#17e6c3";
  const handleClick = (event: MouseEvent<SVGGElement>) => {
    event.stopPropagation();
    onClick();
  };

  return (
    <g className="cursor-pointer" onClick={handleClick} role="button" aria-label={`Select ${prediction.supplierName || "supplier"}`} tabIndex={0}>
      <circle cx={x} cy={y} r={selected ? 8.8 : 7.2} fill="none" stroke={fill} strokeOpacity="0.35" strokeWidth="8" className="origin-center animate-pulse-node" />
      <circle cx={x} cy={y} r={selected ? 6.4 : 4.8} fill={fill} stroke="#e7f6ff" strokeOpacity="0.75" strokeWidth="1.2" />
      <circle cx={x} cy={y} r="12" fill="transparent" />
      {selected && (
        <text x={x + 10} y={y - 9} fill="#dffbff" fontSize="3.1" fontWeight="700">
          {prediction.country}
        </text>
      )}
    </g>
  );
}
