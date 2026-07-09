import { Wand2 } from "lucide-react";
import { useState } from "react";

interface SmartAutofillBoxProps {
  title?: string;
  placeholder: string;
  onApply: (text: string) => void;
}

export default function SmartAutofillBox({ title = "AI Autofill", placeholder, onApply }: SmartAutofillBoxProps) {
  const [text, setText] = useState("");

  return (
    <section className="mb-4 rounded-lg border border-cyanline/20 bg-cyanline/[0.055] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-cyan-100/55">Paste a paragraph. Detected values fill the form; anything not included stays blank.</p>
        </div>
        <button className="btn btn-primary min-h-8 px-2.5 py-1.5 text-xs" type="button" onClick={() => onApply(text)} disabled={!text.trim()}>
          <Wand2 size={14} />
          Autofill Fields
        </button>
      </div>
      <textarea
        className="input mt-3 min-h-20 w-full resize-y"
        value={text}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
      />
    </section>
  );
}
