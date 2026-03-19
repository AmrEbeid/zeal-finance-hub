"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { useFinancialSummary, UK_ENTITY_ID, EG_ENTITY_ID, EntityFilter } from "../../lib/hooks/useFinancialSummary";
import { EntityToggle } from "../../components/EntityToggle";
import Sidebar from "../../components/Sidebar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useState } from "react";
import { formatUSD, formatMonths } from "../../lib/format";

const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981"];

interface CashPosition { id: string; account_name: string; balance: number; currency: string; entity_id: string; }
interface RunwaySnapshot { snapshot_date: string; runway_months: number; }
interface FxRate { from_currency: string; to_currency: string; rate: number; }

function useCashData(entity: EntityFilter) {
  return useQuery({
    queryKey: ["cash-positions", entity],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) return { positions: [], snapshots: [], fx: [] };
      let q = supabase.from("cash_positions").select("*");
      if (entity !== "all") q = q.eq("entity_id", entity);
      const { data: positions } = await q;
      const { data: snapshots } = await supabase.from("runway_snapshots").select("snapshot_date, runway_months").order("snapshot_date", { ascending: true }).limit(12);
      const { data: fx } = await supabase.from("fx_rates").select("from_currency, to_currency, rate");
      return { positions: (positions ?? []) as CashPosition[], snapshots: (snapshots ?? []) as RunwaySnapshot[], fx: (fx ?? []) as FxRate[] };
    },
  });
}

function toUsd(amount: number, currency: string, fx: FxRate[]): number {
  if (currency === "USD") return amount;
  const rate = fx.find((r) => r.from_currency === currency && r.to_currency === "USD");
  return rate ? amount * rate.rate : amount;
}

export default function CashPage() {
  const [entity, setEntity] = useState<EntityFilter>("all");
  const { data, isLoading } = useCashData(entity);
  const summary = useFinancialSummary(entity);
  const positions = data?.positions ?? [];
  const snapshots = data?.snapshots ?? [];
  const fx = data?.fx ?? [];
  const totalCash = positions.reduce((s, p) => s + toUsd(p.balance, p.currency, fx), 0);
  const byCurrency = Object.entries(positions.reduce<Record<string, number>>((acc, p) => { acc[p.currency] = (acc[p.currency] ?? 0) + toUsd(p.balance, p.currency, fx); return acc; }, {})).map(([currency, value]) => ({ currency, value }));
  const chartData = snapshots.map((s) => ({ date: s.snapshot_date.slice(0, 7), months: Number(s.runway_months?.toFixed(1) ?? 0) }));
  const burn = summary.data?.burnRate ?? 0;
  const runway = summary.data?.runwayMonths ?? 0;

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Cash &amp; Runway</h1>
            <p className="text-gray-400 text-sm mt-1">Live bank positions and burn analysis</p>
          </div>
          <EntityToggle value={entity} onChange={setEntity} />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Total Cash (USD)</p>
            <p className="text-3xl font-bold mt-2">{isLoading ? "—" : formatUSD(totalCash)}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Net Burn Rate / mo</p>
            <p className="text-3xl font-bold mt-2 text-amber-400">{summary.isLoading ? "—" : formatUSD(burn)}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Runway</p>
            <p className={"text-3xl font-bold mt-2 " + (runway < 6 ? "text-red-400" : runway < 12 ? "text-amber-400" : "text-emerald-400")}>{summary.isLoading ? "—" : formatMonths(runway)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Runway Trend (months)</h2>
            {chartData.length === 0 ? <p className="text-gray-500 text-sm">No snapshot data yet</p> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151" }} formatter={(v: any) => [v + " mo", "Runway"]} />
                  <Line type="monotone" dataKey="months" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Cash by Currency (USD equiv.)</h2>
            {byCurrency.length === 0 ? <p className="text-gray-500 text-sm">No position data yet</p> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={byCurrency} dataKey="value" nameKey="currency" cx="50%" cy="50%" outerRadius={70}>
                    {byCurrency.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend formatter={(v) => v} />
                  <Tooltip formatter={(v: any) => formatUSD(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="p-4 border-b border-gray-800"><h2 className="text-sm font-semibold text-gray-300">Bank Accounts</h2></div>
          {isLoading ? <p className="p-4 text-gray-500">Loading...</p> : positions.length === 0 ? (
            <p className="p-4 text-gray-500">No cash positions synced yet. Run the QuickBooks sync in n8n.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-400 border-b border-gray-800"><th className="p-4">Account</th><th className="p-4">Entity</th><th className="p-4 text-right">Balance</th><th className="p-4">Currency</th><th className="p-4 text-right">USD Equiv.</th></tr></thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800/40">
                    <td className="p-4 font-medium">{p.account_name}</td>
                    <td className="p-4 text-gray-400">{p.entity_id === UK_ENTITY_ID ? "UK" : p.entity_id === EG_ENTITY_ID ? "EG" : "—"}</td>
                    <td className="p-4 text-right">{p.balance.toLocaleString()}</td>
                    <td className="p-4"><span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-300">{p.currency}</span></td>
                    <td className="p-4 text-right font-semibold">{formatUSD(toUsd(p.balance, p.currency, fx))}</td>
                  </tr>
                ))}
                <tr className="bg-gray-800/60"><td colSpan={4} className="p-4 font-semibold">Total</td><td className="p-4 text-right font-bold text-indigo-400">{formatUSD(totalCash)}</td></tr>
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
