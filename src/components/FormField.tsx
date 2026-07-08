import { Info } from "lucide-react";
import NumberInput from "./NumberInput";

interface FormFieldProps {
  id: string;
  label: string;
  helper: string;
  placeholder?: string;
  unit?: string;
  validation?: string;
  value: string | number;
  type?: "text" | "number" | "date" | "textarea";
  min?: number;
  max?: number;
  onChange: (value: string) => void;
}

export default function FormField({
  id,
  label,
  helper,
  placeholder,
  unit,
  validation,
  value,
  type = "text",
  min,
  max,
  onChange,
}: FormFieldProps) {
  const invalid =
    type === "number" &&
    value !== "" &&
    ((typeof min === "number" && Number(value) < min) || (typeof max === "number" && Number(value) > max));

  return (
    <label className="grid gap-1" htmlFor={id}>
      <span className="flex items-center gap-1 text-xs font-semibold text-cyan-100/75">
        {label}
        <Info size={12} className="text-cyanline/80" />
      </span>
      <span className="text-[0.7rem] leading-4 text-cyan-100/48">{helper}</span>
      <div className="flex overflow-hidden rounded-md border border-cyan-200/20 bg-ink-950/70">
        {type === "textarea" ? (
          <textarea
            id={id}
            className="min-h-20 min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none"
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : type === "number" ? (
          <NumberInput
            id={id}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none"
            min={min}
            max={max}
            placeholder={placeholder}
            value={typeof value === "number" ? value : Number(value)}
            onChange={(nextValue) => onChange(String(nextValue))}
          />
        ) : (
          <input
            id={id}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none"
            type={type}
            min={min}
            max={max}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        {unit && <span className="flex min-w-20 items-center justify-center border-l border-cyan-200/10 px-2 text-[0.68rem] text-cyan-100/45">{unit}</span>}
      </div>
      {(invalid || validation) && <span className={invalid ? "text-[0.68rem] text-risk" : "text-[0.68rem] text-cyan-100/36"}>{validation}</span>}
    </label>
  );
}
