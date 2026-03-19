export function formatUSD(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1_000_000) {
    return "$" + (value / 1_000_000).toFixed(1) + "M";
  }
  if (compact && Math.abs(value) >= 1_000) {
    return "$" + (value / 1_000).toFixed(0) + "K";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return sign + (value * 100).toFixed(1) + "%";
}

export function formatMonths(value: number): string {
  return value.toFixed(1) + " mo";
}

export function momTone(value: number, invert = false): "positive" | "negative" | "neutral" {
  if (value === 0) return "neutral";
  const positive = value > 0;
  return (positive !== invert) ? "positive" : "negative";
}
