"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { EntityFilter } from "../../lib/hooks/useFinancialSummary";
import { EntityToggle } from "../../components/EntityToggle";
import Sidebar from "../../components/Sidebar";
import { useState } from "react";
import { formatUSD } from "../../lib/format";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface PnlRow { label: string; actual: number; budget: number; isHeader?: boolean; isSummary?: boolean; }

function usePnlData(entity: EntityFilter, year: number, month: number) {
  return useQuery({
    queryKey: ["pnl", entity, year, month],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) return [] as PnlRow[];
      const monthStr = String(month).padStart(2, "0");
      const start = year + "-" + monthStr + "-01";
      const end = new Date(year, month, 0).toISOString().split("T")[0];
      let q = supabase.from("journal_entries").select("account_type, amount_usd, entity_id").gte("transaction_date", start).lte("transaction_date", end);
      if (entity !== "all") q = q.eq("entity_id", entity);
      const { data: journals } = await q;
      let bq = supabase.from("budget_pnl").select("account_type, budget_amount, entity_id").eq("year", year).eq("month", month);
      if (entity !== "all") bq = bq.eq("entity_id", entity);
      const { data: budgets } = await bq;
      const rows = (journals ?? []) as any[];
      const budgetRows = (budgets ?? []) as any[];
      const sumA = (type: string) => rows.filter((r) => r.account_type === type).reduce((s: number, r: any) => s + (Number(r.amount_usd) || 0), 0);
      const sumB = (type: string) => budgetRows.filter((r) => r.account_type === type).reduce((s: number, r: any) => s + (Number(r.budget_amount) || 0), 0);
      const revenue = sumA("Income"); const cogs = Math.abs(sumA("COGS") || sumA("Cost of Goods Sold")); const gp = revenue - cogs; const expenses = Math.abs(sumA("Expense")); const net = gp - expenses;
      const revB = sumB("Income"); const cogsB = Math.abs(sumB("COGS") || sumB("Cost of Goods Sold")); const gpB = revB - cogsB; const expB = Math.abs(sumB("Expense")); const netB = gpB - expB;
      return [
        { label: "REVENUE", actual: 0, budget: 0, isHeader: true },
        { label: "Total Revenue", actual: revenue, budget: revB },
        { label: "COST OF GOODS SOLD", actual: 0, budget: 0, isHeader: true },
        { label: "Total COGS", actual: -cogs, budget: -cogsB },
        { label: "GROSS PROFIT", actual: gp, budget: gpB, isSummary: true },
        { label: "OPERATING EXPENSES", actual: 0, budget: 0, isHeader: true },
        { label: "Total Expenses", actual: -expenses, budget: -expB },
        { label: "NET BURN", actual: net, budget: netB, isSummary: true },
      ] as PnlRow[];
    },
  });
}

function VarBadge({ actual, budget }: { actual: number; budget: number }) {
  if (budget === 0) return <span className="text-gray-500">—</span>;
  const pct = ((actual - budget) / Math.abs(budget)) * 100;
  return <span className={pct >= 0 ? "text-emerald-400" : "text-red-400"}>{pct > 0 ? "+" : ""}{pct.toFixed(1)}%</span>;
}

export default function PnlPage() {
  const now = new Date();
  const [entity, setEntity] = useState<EntityFilter>("all");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { data: pnlRows, isLoading } = usePnlData(entity, year, month);
  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold">P&amp;L Statement</h1><p className="text-gray-400 text-sm mt-1">Actuals vs budget by month</p></div>
          <div className="flex items-center gap-3">
            <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <EntityToggle value={entity} onChange={setEntity} />
          </div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-400 border-b border-gray-800"><th className="p-4 w-1/3">Line Item</th><th className="p-4 text-right">Actual MTD</th><th className="p-4 text-right">Budget MTD</th><th className="p-4 text-right">Variance</th><th className="p-4 text-right">Var %</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="p-6 text-center text-gray-500">Loading...</td></tr> : (pnlRows ?? []).map((row, i) => {
                if (row.isHeader) return <tr key={i} className="bg-gray-800/40"><td colSpan={5} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-400">{row.label}</td></tr>;
                if (row.isSummary) {
                  const v = row.actual - row.budget;
                  return <tr key={i} className="bg-indigo-950/40 border-t border-b border-indigo-900"><td className="px-4 py-3 font-bold text-indigo-300">{row.label}</td><td className="px-4 py-3 text-right font-bold">{formatUSD(row.actual)}</td><td className="px-4 py-3 text-right text-gray-400">{row.budget ? formatUSD(row.budget) : "—"}</td><td className={"px-4 py-3 text-right font-semibold " + (v >= 0 ? "text-emerald-400" : "text-red-400")}>{v > 0 ? "+" : ""}{formatUSD(v)}</td><td className="px-4 py-3 text-right"><VarBadge actual={row.actual} budget={row.budget} /></td></tr>;
                }
                const v = row.actual - row.budget;
                return <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30"><td className="px-4 py-3">{row.label}</td><td className="px-4 py-3 text-right">{formatUSD(row.actual)}</td><td className="px-4 py-3 text-right text-gray-400">{row.budget ? formatUSD(row.budget) : "—"}</td><td className={"px-4 py-3 text-right " + (v >= 0 ? "text-emerald-400" : "text-red-400")}>{v > 0 ? "+" : ""}{formatUSD(v)}</td><td className="px-4 py-3 text-right"><VarBadge actual={row.actual} budget={row.budget} /></td></tr>;
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-600 mt-4">* Budgets sourced from budget_pnl. Run the SharePoint budget sync in n8n to populate.</p>
      </main>
    </div>
  );
}
