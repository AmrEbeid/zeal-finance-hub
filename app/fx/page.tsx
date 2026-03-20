"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { EntityFilter } from "../../lib/hooks/useFinancialSummary";
import { EntityToggle } from "../../components/EntityToggle";
import Sidebar from "../../components/Sidebar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { formatUSD } from "../../lib/format";

interface FxRate { id: string; from_currency: string; to_currency: string; rate: number; effective_date: string; }
interface CashPosition { balance: number; currency: string; entity_id: string; }

function useFxData(entity: EntityFilter) {
  return useQuery({
    queryKey: ["fx", entity],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) return { rates: [], positions: [], history: [] };
      const { data: rates } = await supabase.from("fx_rates").select("*").order("effective_date", { ascending: false });
      let pq = supabase.from("cash_positions").select("balance, currency, entity_id");
      if (entity !== "all") pq = pq.eq("entity_id", entity);
      const { data: positions } = await pq;
      const { data: history } = await supabase.from("fx_rates")
        .select("from_currency, to_currency, rate, effective_date")
        .eq("from_currency", "GBP").eq("to_currency", "USD")
        .order("effective_date", { ascending: true }).limit(30);
      return { rates: (rates ?? []) as FxRate[], positions: (positions ?? []) as CashPosition[], history: history ?? [] };
    },
  });
}

function toUsd(amount: number, currency: string, rates: FxRate[]): number {
  if (currency === "USD") return amount;
  const r = rates.find((x) => x.from_currency === currency && x.to_currency === "USD");
  return r ? amount * r.rate : amount;
}

export default function FxPage() {
  const [entity, setEntity] = useState<EntityFilter>("all");
  const { data, isLoading, refetch } = useFxData(entity);
  const rates = data?.rates ?? [];
  const positions = data?.positions ?? [];
  const history = (data?.history ?? []).map((r: any) => ({ date: r.effective_date?.slice(0, 10), rate: Number(r.rate) }));

  // Latest unique rates
  const latestRates = Object.values(
    rates.reduce<Record<string, FxRate>>((acc, r) => {
      const key = r.from_currency + r.to_currency;
      if (!acc[key] || r.effective_date > acc[key].effective_date) acc[key] = r;
      return acc;
    }, {})
  );

  // Exposure by currency
  const exposure = Object.entries(
    positions.reduce<Record<string, number>>((acc, p) => {
      acc[p.currency] = (acc[p.currency] ?? 0) + toUsd(p.balance, p.currency, latestRates);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const totalExposure = exposure.reduce((s, [, v]) => s + v, 0);

  const CURRENCY_COLORS: Record<string, string> = { GBP: "#6366f1", USD: "#10b981", EGP: "#f59e0b", EUR: "#22d3ee" };

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">FX &amp; Currency</h1>
            <p className="text-gray-400 text-sm mt-1">Exchange rates and currency exposure</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => refetch()} className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-colors">
              ↻ Refresh rates
            </button>
            <EntityToggle value={entity} onChange={setEntity} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Current rates */}
          <div className="bg-gray-900 rounded-xl border border-gray-800">
            <div className="p-4 border-b border-gray-800"><h2 className="text-sm font-semibold text-gray-300">Current FX Rates</h2></div>
            {isLoading ? <p className="p-4 text-gray-500">Loading...</p> : latestRates.length === 0 ? (
              <p className="p-4 text-gray-500">No FX rates found. Seed rates in Supabase fx_rates table.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-400 border-b border-gray-800"><th className="p-4">From</th><th className="p-4">To</th><th className="p-4 text-right">Rate</th><th className="p-4 text-right">As of</th></tr></thead>
                <tbody>
                  {latestRates.map((r, i) => (
                    <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30">
                      <td className="p-4 font-semibold"><span style={{ color: CURRENCY_COLORS[r.from_currency] ?? "#fff" }}>{r.from_currency}</span></td>
                      <td className="p-4 text-gray-400">{r.to_currency}</td>
                      <td className="p-4 text-right font-mono">{Number(r.rate).toFixed(4)}</td>
                      <td className="p-4 text-right text-gray-500 text-xs">{r.effective_date?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Exposure */}
          <div className="bg-gray-900 rounded-xl border border-gray-800">
            <div className="p-4 border-b border-gray-800"><h2 className="text-sm font-semibold text-gray-300">Cash Exposure by Currency (USD equiv.)</h2></div>
            {isLoading ? <p className="p-4 text-gray-500">Loading...</p> : exposure.length === 0 ? (
              <p className="p-4 text-gray-500">No cash position data yet.</p>
            ) : (
              <div className="p-4 space-y-3">
                {exposure.map(([currency, value], i) => {
                  const pct = totalExposure > 0 ? (value / totalExposure) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold" style={{ color: CURRENCY_COLORS[currency] ?? "#fff" }}>{currency}</span>
                        <span>{formatUSD(value)} <span className="text-gray-500">({pct.toFixed(1)}%)</span></span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: pct + "%", background: CURRENCY_COLORS[currency] ?? "#6366f1" }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-gray-800 flex justify-between text-sm font-semibold">
                  <span>Total</span><span>{formatUSD(totalExposure)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* GBP/USD trend */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">GBP / USD Rate History</h2>
          {history.length < 2 ? <p className="text-gray-500 text-sm">Not enough historical data. Seed multiple dates in fx_rates to see trend.</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <YAxis domain={["auto", "auto"]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151" }} formatter={(v: any) => [Number(v).toFixed(4), "GBP/USD"]} />
                <Line type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </main>
    </div>
  );
}
