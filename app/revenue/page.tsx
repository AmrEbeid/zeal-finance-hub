"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { UK_ENTITY_ID, EG_ENTITY_ID, EntityFilter } from "../../lib/hooks/useFinancialSummary";
import { EntityToggle } from "../../components/EntityToggle";
import Sidebar from "../../components/Sidebar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { formatUSD, formatPct } from "../../lib/format";

interface RevenueRow { month: string; uk: number; eg: number; total: number; }
interface AccountRow { account: string; actual: number; prev: number; }

function useRevenueData(entity: EntityFilter) {
  return useQuery({
    queryKey: ["revenue", entity],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) return { monthly: [], byAccount: [], ytd: 0 };
      const now = new Date();
      const ytdStart = now.getFullYear() + "-01-01";
      const { data: rows } = await supabase
        .from("journal_entries")
        .select("transaction_date, amount_usd, entity_id, account_name")
        .eq("account_type", "Income")
        .gte("transaction_date", ytdStart)
        .order("transaction_date", { ascending: true });
      const all = (rows ?? []) as any[];
      const filtered = entity === "all" ? all : all.filter((r) => r.entity_id === entity);

      // Group by month
      const monthMap: Record<string, { uk: number; eg: number }> = {};
      filtered.forEach((r) => {
        const m = r.transaction_date.slice(0, 7);
        if (!monthMap[m]) monthMap[m] = { uk: 0, eg: 0 };
        if (r.entity_id === UK_ENTITY_ID) monthMap[m].uk += Number(r.amount_usd) || 0;
        else monthMap[m].eg += Number(r.amount_usd) || 0;
      });
      const monthly: RevenueRow[] = Object.entries(monthMap).map(([month, v]) => ({
        month, uk: v.uk, eg: v.eg, total: v.uk + v.eg,
      }));

      // Group by account
      const accMap: Record<string, { curr: number; prev: number }> = {};
      all.forEach((r) => {
        const acc = r.account_name ?? "Unknown";
        if (!accMap[acc]) accMap[acc] = { curr: 0, prev: 0 };
        const m = new Date(r.transaction_date).getMonth();
        if (m === now.getMonth()) accMap[acc].curr += Number(r.amount_usd) || 0;
        else if (m === now.getMonth() - 1) accMap[acc].prev += Number(r.amount_usd) || 0;
      });
      const byAccount: AccountRow[] = Object.entries(accMap).map(([account, v]) => ({
        account, actual: v.curr, prev: v.prev,
      })).sort((a, b) => b.actual - a.actual);

      const ytd = filtered.reduce((s, r) => s + (Number(r.amount_usd) || 0), 0);
      return { monthly, byAccount, ytd };
    },
  });
}

function MomBadge({ actual, prev }: { actual: number; prev: number }) {
  if (prev === 0) return <span className="text-gray-500">—</span>;
  const pct = ((actual - prev) / Math.abs(prev)) * 100;
  return <span className={pct >= 0 ? "text-emerald-400" : "text-red-400"}>{pct > 0 ? "+" : ""}{pct.toFixed(1)}%</span>;
}

export default function RevenuePage() {
  const [entity, setEntity] = useState<EntityFilter>("all");
  const { data, isLoading } = useRevenueData(entity);
  const monthly = data?.monthly ?? [];
  const byAccount = data?.byAccount ?? [];
  const ytd = data?.ytd ?? 0;
  const mtd = byAccount.reduce((s, r) => s + r.actual, 0);

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Revenue</h1>
            <p className="text-gray-400 text-sm mt-1">YTD breakdown by entity and account</p>
          </div>
          <EntityToggle value={entity} onChange={setEntity} />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-400 text-xs uppercase tracking-wide">MTD Revenue</p>
            <p className="text-3xl font-bold mt-2 text-emerald-400">{isLoading ? "—" : formatUSD(mtd)}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-400 text-xs uppercase tracking-wide">YTD Revenue</p>
            <p className="text-3xl font-bold mt-2">{isLoading ? "—" : formatUSD(ytd)}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Active Months</p>
            <p className="text-3xl font-bold mt-2">{monthly.filter(m => m.total > 0).length}</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Monthly Revenue by Entity (USD)</h2>
          {monthly.length === 0 ? (
            <p className="text-gray-500 text-sm">No revenue data yet. Activate the QuickBooks sync in n8n.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => "$" + (v/1000).toFixed(0) + "k"} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151" }} formatter={(v: any) => formatUSD(Number(v))} />
                <Legend />
                <Bar dataKey="uk" name="UK" fill="#6366f1" radius={[3,3,0,0]} />
                <Bar dataKey="eg" name="Egypt" fill="#22d3ee" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="p-4 border-b border-gray-800"><h2 className="text-sm font-semibold text-gray-300">Revenue by Account (MTD vs Prior Month)</h2></div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-400 border-b border-gray-800"><th className="p-4">Account</th><th className="p-4 text-right">This Month</th><th className="p-4 text-right">Prior Month</th><th className="p-4 text-right">MoM %</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={4} className="p-6 text-center text-gray-500">Loading...</td></tr>
              : byAccount.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-gray-500">No data yet.</td></tr>
              : byAccount.map((r, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30">
                  <td className="p-4 font-medium">{r.account}</td>
                  <td className="p-4 text-right text-emerald-400">{formatUSD(r.actual)}</td>
                  <td className="p-4 text-right text-gray-400">{formatUSD(r.prev)}</td>
                  <td className="p-4 text-right"><MomBadge actual={r.actual} prev={r.prev} /></td>
                </tr>
              ))}
              {byAccount.length > 0 && (
                <tr className="bg-gray-800/60 font-semibold">
                  <td className="p-4">Total</td>
                  <td className="p-4 text-right text-emerald-400">{formatUSD(mtd)}</td>
                  <td className="p-4 text-right text-gray-300">{formatUSD(byAccount.reduce((s,r)=>s+r.prev,0))}</td>
                  <td className="p-4 text-right"><MomBadge actual={mtd} prev={byAccount.reduce((s,r)=>s+r.prev,0)} /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
