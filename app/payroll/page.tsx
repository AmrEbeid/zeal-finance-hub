"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { UK_ENTITY_ID, EG_ENTITY_ID, EntityFilter } from "../../lib/hooks/useFinancialSummary";
import { EntityToggle } from "../../components/EntityToggle";
import Sidebar from "../../components/Sidebar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { formatUSD } from "../../lib/format";

interface PayrollEntry { month: string; entity: string; amount: number; }
interface HeadcountRow { entity_id: string; count: number; as_of: string; }

function usePayrollData(entity: EntityFilter) {
  return useQuery({
    queryKey: ["payroll", entity],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) return { entries: [], monthly: [], headcount: [], totalMtd: 0 };
      const now = new Date();
      const ytdStart = now.getFullYear() + "-01-01";
      const monthStr = String(now.getMonth() + 1).padStart(2, "0");
      const mtdStart = now.getFullYear() + "-" + monthStr + "-01";

      let q = supabase.from("journal_entries")
        .select("transaction_date, amount_usd, entity_id, account_name, description")
        .or("account_type.ilike.%Payroll%,account_name.ilike.%Salary%,account_name.ilike.%Payroll%,account_name.ilike.%Wage%")
        .gte("transaction_date", ytdStart)
        .order("transaction_date", { ascending: false });
      if (entity !== "all") q = q.eq("entity_id", entity);
      const { data: rows } = await q;
      const entries = (rows ?? []) as any[];

      // Monthly totals
      const monthMap: Record<string, { uk: number; eg: number }> = {};
      entries.forEach((r) => {
        const m = r.transaction_date.slice(0, 7);
        if (!monthMap[m]) monthMap[m] = { uk: 0, eg: 0 };
        const amt = Math.abs(Number(r.amount_usd) || 0);
        if (r.entity_id === UK_ENTITY_ID) monthMap[m].uk += amt;
        else monthMap[m].eg += amt;
      });
      const monthly = Object.entries(monthMap).map(([month, v]) => ({ month, UK: v.uk, EG: v.eg, total: v.uk + v.eg }));

      // Headcount
      const { data: hc } = await supabase.from("headcount").select("*").order("as_of", { ascending: false }).limit(10);
      const headcount = (hc ?? []) as HeadcountRow[];

      // MTD total
      const totalMtd = entries.filter(r => r.transaction_date >= mtdStart).reduce((s, r) => s + Math.abs(Number(r.amount_usd) || 0), 0);

      return { entries: entries.slice(0, 50), monthly, headcount, totalMtd };
    },
  });
}

export default function PayrollPage() {
  const [entity, setEntity] = useState<EntityFilter>("all");
  const { data, isLoading } = usePayrollData(entity);
  const entries = data?.entries ?? [];
  const monthly = data?.monthly ?? [];
  const headcount = data?.headcount ?? [];
  const totalMtd = data?.totalMtd ?? 0;

  const totalHc = headcount.reduce((s, r) => s + (Number(r.count) || 0), 0);
  const lastMonth = monthly.length > 1 ? monthly[monthly.length - 2]?.total ?? 0 : 0;
  const momSwing = lastMonth > 0 ? ((totalMtd - lastMonth) / lastMonth) * 100 : 0;
  const bigSwing = Math.abs(momSwing) > 15;

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Payroll Hub</h1>
            <p className="text-gray-400 text-sm mt-1">Payroll costs and headcount by entity</p>
          </div>
          <EntityToggle value={entity} onChange={setEntity} />
        </div>

        {bigSwing && (
          <div className="mb-4 px-4 py-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-sm flex items-center gap-2">
            <span className="text-red-400 font-bold">⚠ Alert:</span>
            Payroll swung {momSwing > 0 ? "+" : ""}{momSwing.toFixed(1)}% vs prior month — review before approving.
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-400 text-xs uppercase tracking-wide">MTD Payroll</p>
            <p className="text-3xl font-bold mt-2 text-amber-400">{isLoading ? "—" : formatUSD(totalMtd)}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Headcount (latest)</p>
            <p className="text-3xl font-bold mt-2">{isLoading ? "—" : totalHc || "—"}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-400 text-xs uppercase tracking-wide">MoM Change</p>
            <p className={"text-3xl font-bold mt-2 " + (momSwing > 0 ? "text-red-400" : "text-emerald-400")}>
              {lastMonth > 0 ? (momSwing > 0 ? "+" : "") + momSwing.toFixed(1) + "%" : "—"}
            </p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Monthly Payroll Cost by Entity (USD)</h2>
          {monthly.length === 0 ? <p className="text-gray-500 text-sm">No payroll data yet.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => "$" + (v/1000).toFixed(0) + "k"} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151" }} formatter={(v: any) => formatUSD(Number(v))} />
                <Bar dataKey="UK" fill="#6366f1" radius={[3,3,0,0]} />
                <Bar dataKey="EG" fill="#22d3ee" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="p-4 border-b border-gray-800"><h2 className="text-sm font-semibold text-gray-300">Payroll Entries (YTD)</h2></div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-400 border-b border-gray-800"><th className="p-4">Date</th><th className="p-4">Account</th><th className="p-4">Entity</th><th className="p-4 text-right">Amount (USD)</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={4} className="p-6 text-center text-gray-500">Loading...</td></tr>
              : entries.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-gray-500">No payroll entries found. Check account mapping in Supabase.</td></tr>
              : entries.map((r, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30">
                  <td className="p-4 text-gray-400">{r.transaction_date.slice(0, 10)}</td>
                  <td className="p-4">{r.account_name ?? "—"}</td>
                  <td className="p-4"><span className="px-2 py-0.5 rounded text-xs bg-gray-800">{r.entity_id === UK_ENTITY_ID ? "UK" : r.entity_id === EG_ENTITY_ID ? "EG" : "—"}</span></td>
                  <td className="p-4 text-right font-semibold">{formatUSD(Math.abs(Number(r.amount_usd) || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
