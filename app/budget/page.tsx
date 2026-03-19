"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { EntityFilter } from "../../lib/hooks/useFinancialSummary";
import { EntityToggle } from "../../components/EntityToggle";
import Sidebar from "../../components/Sidebar";
import { useState } from "react";
import { formatUSD } from "../../lib/format";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
interface DeptRow { dept: string; budget: number; actual: number; }

function useBudgetData(entity: EntityFilter, year: number, month: number) {
  return useQuery({
    queryKey: ["budget-vs-actual", entity, year, month],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) return [] as DeptRow[];
      const monthStr = String(month).padStart(2, "0");
      const start = year + "-" + monthStr + "-01";
      const end = new Date(year, month, 0).toISOString().split("T")[0];
      let aq = supabase.from("journal_entries").select("department, account_type, amount_usd, entity_id").gte("transaction_date", start).lte("transaction_date", end).eq("account_type", "Expense");
      if (entity !== "all") aq = aq.eq("entity_id", entity);
      const { data: actuals } = await aq;
      let bq = supabase.from("budget_pnl").select("department, budget_amount, entity_id").eq("year", year).eq("month", month).eq("account_type", "Expense");
      if (entity !== "all") bq = bq.eq("entity_id", entity);
      const { data: budgets } = await bq;
      const rows = (actuals ?? []) as any[];
      const budgetRows = (budgets ?? []) as any[];
      const depts = new Set<string>([...rows.map((r: any) => r.department ?? "Unclassified"), ...budgetRows.map((r: any) => r.department ?? "Unclassified")]);
      return Array.from(depts).map((dept): DeptRow => ({
        dept,
        actual: Math.abs(rows.filter((r: any) => (r.department ?? "Unclassified") === dept).reduce((s: number, r: any) => s + (Number(r.amount_usd) || 0), 0)),
        budget: Math.abs(budgetRows.filter((r: any) => (r.department ?? "Unclassified") === dept).reduce((s: number, r: any) => s + (Number(r.budget_amount) || 0), 0)),
      }));
    },
  });
}

function VarianceBar({ actual, budget }: { actual: number; budget: number }) {
  if (budget === 0) return <div className="text-gray-500 text-xs">No budget set</div>;
  const pct = Math.min((actual / budget) * 100, 120);
  const over = actual > budget; const overBy = actual > budget * 1.2;
  const barColor = overBy ? "bg-red-500" : over ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden"><div className={"h-2 rounded-full transition-all " + barColor} style={{ width: Math.min(pct, 100) + "%" }} /></div>
      <span className={"text-xs w-10 text-right " + (over ? "text-amber-400" : "text-gray-400")}>{pct.toFixed(0)}%</span>
    </div>
  );
}

export default function BudgetPage() {
  const now = new Date();
  const [entity, setEntity] = useState<EntityFilter>("all");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { data: rows, isLoading } = useBudgetData(entity, year, month);
  const totalBudget = (rows ?? []).reduce((s, r) => s + r.budget, 0);
  const totalActual = (rows ?? []).reduce((s, r) => s + r.actual, 0);
  const totalVar = totalActual - totalBudget;
  const overallPct = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
  const sorted = [...(rows ?? [])].sort((a, b) => b.actual - a.actual);
  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold">Budget vs Actual</h1><p className="text-gray-400 text-sm mt-1">Spend tracking by department</p></div>
          <div className="flex items-center gap-3">
            <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select>
            <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" value={year} onChange={(e) => setYear(Number(e.target.value))}>{[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}</select>
            <EntityToggle value={entity} onChange={setEntity} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800"><p className="text-gray-400 text-xs uppercase tracking-wide">Total Budget</p><p className="text-xl font-bold mt-1">{formatUSD(totalBudget)}</p></div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800"><p className="text-gray-400 text-xs uppercase tracking-wide">Total Actual</p><p className="text-xl font-bold mt-1">{formatUSD(totalActual)}</p></div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800"><p className="text-gray-400 text-xs uppercase tracking-wide">Variance</p><p className={"text-xl font-bold mt-1 " + (totalVar <= 0 ? "text-emerald-400" : "text-red-400")}>{totalVar > 0 ? "+" : ""}{formatUSD(totalVar)}</p></div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800"><p className="text-gray-400 text-xs uppercase tracking-wide">Utilisation</p><p className={"text-xl font-bold mt-1 " + (overallPct > 100 ? "text-red-400" : overallPct > 85 ? "text-amber-400" : "text-emerald-400")}>{overallPct.toFixed(1)}%</p></div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Department Breakdown</h2>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> On budget</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> &gt;100%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> &gt;120%</span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-400 border-b border-gray-800"><th className="p-4">Department</th><th className="p-4 text-right">Budget</th><th className="p-4 text-right">Actual</th><th className="p-4 text-right">Variance</th><th className="p-4 w-48">Utilisation</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="p-6 text-center text-gray-500">Loading...</td></tr> : sorted.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-gray-500">No data. Sync QuickBooks + budget in n8n first.</td></tr> : (
                <>
                  {sorted.map((row, i) => {
                    const v = row.actual - row.budget; const over = row.budget > 0 && row.actual > row.budget; const overBy = row.budget > 0 && row.actual > row.budget * 1.2;
                    return <tr key={i} className={"border-b border-gray-800 hover:bg-gray-800/30 " + (overBy ? "bg-red-950/20" : over ? "bg-amber-950/20" : "")}>
                      <td className="p-4 font-medium">{row.dept}{overBy && <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-900/60 text-red-300 rounded">Over</span>}{!overBy && over && <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-900/60 text-amber-300 rounded">Watch</span>}</td>
                      <td className="p-4 text-right text-gray-400">{row.budget > 0 ? formatUSD(row.budget) : "—"}</td>
                      <td className="p-4 text-right">{formatUSD(row.actual)}</td>
                      <td className={"p-4 text-right " + (v <= 0 ? "text-emerald-400" : "text-red-400")}>{v > 0 ? "+" : ""}{formatUSD(v)}</td>
                      <td className="p-4"><VarianceBar actual={row.actual} budget={row.budget} /></td>
                    </tr>;
                  })}
                  <tr className="bg-gray-800/60 font-semibold"><td className="p-4">Total</td><td className="p-4 text-right text-gray-300">{formatUSD(totalBudget)}</td><td className="p-4 text-right">{formatUSD(totalActual)}</td><td className={"p-4 text-right " + (totalVar <= 0 ? "text-emerald-400" : "text-red-400")}>{totalVar > 0 ? "+" : ""}{formatUSD(totalVar)}</td><td className="p-4"><VarianceBar actual={totalActual} budget={totalBudget} /></td></tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
