
"use client";
import { useState } from "react";
import { useFinancialSummary, EntityFilter } from "@/lib/hooks/useFinancialSummary";
import { KPICard } from "@/components/ui/KPICard";
import { EntityToggle } from "@/components/EntityToggle";
import Sidebar from "@/components/Sidebar";
import { formatUSD, formatPct, formatMonths, momTone } from "@/lib/format";

export default function ControlCenter() {
  const [entity, setEntity] = useState<EntityFilter>("all");
  const { data, isLoading } = useFinancialSummary(entity);

  const loading = isLoading || !data;

  const kpis = [
    {
      label: "MTD Revenue",
      value: loading ? "—" : formatUSD(data.mtdRevenue),
      subtitle: loading ? "" : "YTD " + formatUSD(data.ytdRevenue, true),
      trend: loading || data.momRevenue === 0 ? undefined : formatPct(data.momRevenue) + " MoM",
      tone: loading ? "neutral" as const : momTone(data.momRevenue),
    },
    {
      label: "MTD Expenses",
      value: loading ? "—" : formatUSD(data.mtdExpenses + data.mtdCOGS),
      subtitle: loading ? "" : "YTD " + formatUSD(data.ytdExpenses, true),
      trend: loading || data.momExpenses === 0 ? undefined : formatPct(data.momExpenses) + " MoM",
      tone: loading ? "neutral" as const : momTone(data.momExpenses, true),
    },
    {
      label: "Gross Profit",
      value: loading ? "—" : formatUSD(data.grossProfit),
      subtitle: loading ? "" : "Revenue minus COGS",
      tone: loading ? "neutral" as const : (data.grossProfit >= 0 ? "positive" as const : "negative" as const),
    },
    {
      label: "Net Burn Rate",
      value: loading ? "—" : formatUSD(data.burnRate),
      subtitle: "per month",
      tone: loading ? "neutral" as const : (data.burnRate === 0 ? "positive" as const : data.burnRate < 50_000 ? "neutral" as const : "negative" as const),
    },
    {
      label: "Cash Runway",
      value: loading ? "—" : formatMonths(data.runwayMonths),
      subtitle: loading ? "" : "Cash: " + formatUSD(data.totalCashUsd, true),
      tone: loading ? "neutral" as const : (data.runwayMonths > 12 ? "positive" as const : data.runwayMonths > 6 ? "neutral" as const : "negative" as const),
    },
    {
      label: "Headcount",
      value: loading ? "—" : String(data.headcount),
      subtitle: "active employees",
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-8 py-5">
          <div>
            <h1 className="text-xl font-semibold text-white">Control Center</h1>
            <p className="text-sm text-zinc-500">
              {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </p>
          </div>
          <EntityToggle value={entity} onChange={setEntity} />
        </div>

        {/* Awaiting sync banner */}
        {!loading && data.awaitingDataSync && (
          <div className="mx-8 mt-5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <span className="mt-0.5 text-base">⚠️</span>
            <div>
              <span className="font-semibold">Awaiting data sync from QuickBooks → Supabase.</span>
              <span className="ml-1 text-amber-400/80">
                Connect n8n credentials to see live numbers.
              </span>
            </div>
          </div>
        )}

        {/* KPI grid */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((kpi) => (
              <KPICard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                subtitle={kpi.subtitle}
                trend={kpi.trend}
                tone={kpi.tone}
              />
            ))}
          </div>
        </div>

        {/* Summary strip */}
        {!loading && !data.awaitingDataSync && (
          <div className="mx-8 rounded-xl border border-zinc-800 bg-zinc-900/60 px-6 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wide">YTD Revenue</div>
                <div className="mt-1 font-semibold text-white">{formatUSD(data.ytdRevenue)}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wide">YTD Expenses</div>
                <div className="mt-1 font-semibold text-white">{formatUSD(data.ytdExpenses)}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Net P&amp;L YTD</div>
                <div className={"mt-1 font-semibold " + (data.ytdRevenue - data.ytdExpenses >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {formatUSD(data.ytdRevenue - data.ytdExpenses)}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Total Cash</div>
                <div className="mt-1 font-semibold text-white">{formatUSD(data.totalCashUsd)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Coming soon pages */}
        <div className="mx-8 my-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {["P&L Statement","Revenue Breakdown","Cash & Runway","Budget vs Actual","Payroll Hub","Payables","FX & Currency","Valuation"].map((page) => (
            <div
              key={page}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-400"
            >
              <span>{page}</span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">Soon</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
