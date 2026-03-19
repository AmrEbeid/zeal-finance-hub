
"use client";
import { UK_ENTITY_ID, EG_ENTITY_ID, EntityFilter } from "@/lib/hooks/useFinancialSummary";

const OPTIONS: { label: string; value: EntityFilter }[] = [
  { label: "All", value: "all" },
  { label: "UK",  value: UK_ENTITY_ID },
  { label: "EG",  value: EG_ENTITY_ID },
];

interface Props {
  value: EntityFilter;
  onChange: (v: EntityFilter) => void;
}

export function EntityToggle({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={
            "rounded-md px-3 py-1 text-xs font-semibold transition-all " +
            (value === opt.value
              ? "bg-indigo-600 text-white shadow"
              : "text-zinc-400 hover:text-zinc-100")
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
