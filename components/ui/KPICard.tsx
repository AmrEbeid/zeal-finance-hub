"use client";

import * as React from "react";

type Props = {
  label: string;
  value: string;
  subtitle?: string;
  trend?: string;
  tone?: "positive" | "negative" | "neutral";
  children?: React.ReactNode; // for future sparkline
};

export function KPICard({ label, value, subtitle, trend, tone = "neutral", children }: Props) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-500"
      : tone === "negative"
        ? "text-red-500"
        : "text-zinc-100";

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-slate-900/80 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          {label}
        </div>
        {trend ? (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tone === "positive" ? "bg-emerald-500/10 text-emerald-400" : tone === "negative" ? "bg-red-500/10 text-red-400" : "bg-zinc-700/60 text-zinc-300"}`}
          >
            {trend}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <div className={`text-2xl font-semibold leading-tight ${toneClass}`}>{value}</div>
          {subtitle ? (
            <div className="mt-1 text-xs text-zinc-400">{subtitle}</div>
          ) : null}
        </div>
        {children ? <div className="h-10 w-20">{children}</div> : null}
      </div>
    </div>
  );
}

