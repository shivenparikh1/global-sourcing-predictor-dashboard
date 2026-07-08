export const currency = (value: number, digits = 2) => {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(digits)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(digits)}K`;
  return `$${value.toFixed(digits)}`;
};

export const number = (value: number, digits = 1) => value.toLocaleString(undefined, { maximumFractionDigits: digits });

export const pct = (value: number, digits = 1) => `${value.toFixed(digits)}%`;

export const compactDateTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
