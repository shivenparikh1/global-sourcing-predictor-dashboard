import { useId } from "react";
import { Search } from "lucide-react";

interface SearchableSelectProps {
  label: string;
  helper?: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
}

export default function SearchableSelect({ label, helper, value, options, placeholder, onChange }: SearchableSelectProps) {
  const generatedId = useId();
  const datalistId = `${generatedId}-options`;

  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-cyan-100/75">{label}</span>
      {helper && <span className="text-[0.7rem] leading-4 text-cyan-100/48">{helper}</span>}
      <div className="flex overflow-hidden rounded-md border border-cyan-200/20 bg-ink-950/70 focus-within:border-cyanline/70 focus-within:ring-2 focus-within:ring-cyanline/20">
        <span className="flex items-center border-r border-cyan-200/10 px-2 text-cyanline/75">
          <Search size={14} />
        </span>
        <input
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none"
          list={datalistId}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <datalist id={datalistId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  );
}
