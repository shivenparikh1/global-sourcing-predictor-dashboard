import { useEffect, useRef, useState } from "react";

interface NumberInputProps {
  id?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: string | number;
  placeholder?: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
}

const textFromNumber = (value: number) => (value === 0 || !Number.isFinite(value) ? "" : String(value));

export default function NumberInput({ id, className, min, max, step, placeholder, value, onChange, onBlur }: NumberInputProps) {
  const [text, setText] = useState(textFromNumber(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(textFromNumber(value));
  }, [value]);

  return (
    <input
      id={id}
      className={className}
      type="number"
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        if (text === "") onChange(0);
        onBlur?.();
      }}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        onChange(next === "" ? 0 : Number(next));
      }}
    />
  );
}
