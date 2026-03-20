"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { UK_ENTITY_ID, EG_ENTITY_ID, EntityFilter } from "../../lib/hooks/useFinancialSummary";
import { EntityToggle } from "../../components/EntityToggle";
import Sidebar from "../../components/Sidebar";
import { useState } from "react";
import { formatUSD } from "../../lib/format";

interface PayableRow {
  id: string;
  transaction_date: string;
  account_name: string;
  description: string;
  amount_usd: number;
  entity_id: string;
  due_date?: string;
}

function usePayablesData(entity: EntityFilter, overdueOnly: boolean) {
  return useQuery({
    queryKey: ["payables", entity, overdueOnly],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) return { rows: [], total: 0, overdue: 0 };
      let q = supabase.from("journal_entries")
        .select("id, transaction_date, account_name, description, amount_usd, entity_id")
        .or("account_type.ilike.%Payable%,account_name.ilike.%Accounts Payable%,account_name.ilike.%AP%")
        .order("transaction_date", { ascending: false })
        .limit(200);
      if (entity !== "all") q = q.eq("entity_id", entity);
      const { data } = await q;
      const rows = ((data ?? []) as PayableRow[]).map((r) => ({
        ...r,
        amount_usd: Math.abs(Number(r.amount_usd) || 0),
        days_overdue: r.due_date ? Math.max(0, Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000)) : null,
      }));
      const today = new Date().toISOString().split("T")[0];
      const filtered = overdueOnly ? rows.filter((r) => r.due_date && r.due_date < today) : rows;
      const total = rows.reduce((s, r) => s + r.amount_usd, 0);
      const overdue = rows.filter((r) => r.due_date && r.due_date < today).reduce((s, r) => s + r.amount_usd, 0);
      return { rows: filtered, total, overdue };
    },
  });
}

export default function PayablesPage() {
  const [entity, setEntity] = useState<EntityFilter>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const { data, isLoading } = usePayablesData(entity, overdueOnly);
  const rows = (data?.rows ?? []) as any[];
  const total = data?.total ?? 0;
  const overdue = data?.overdue ?? 0;
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Payables</h1>
            <p className="text-gray-400 text-sm mt-1">Accounts payable and outstanding vendor bills</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOverdueOnly(!overdueOnly)}
              className={"px-3 py-1.5 rounded-lg text-sm border transition-colors " + (overdueOnly ? "bg-red-900/40 border-red-700 text-red-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white")}
            >
              {overdueOnly ? "Showing: Overdue only" : "Show: All payables"}
            </button>
            <EntityToggle value={entity} onChange={setEntity} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Total Outstanding</p>
            <p className="text-3xl font-bold mt-2">{isLoading ? "—" : formatUSD(total)}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Overdue</p>
            <p className={"text-3xl font-bold mt-2 " + (overdue > 0 ? "text-red-400" : "text-emerald-400")}>{isLoading ? "—" : formatUSD(overdue)}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Pending Items</p>
            <p className="text-3xl font-bold mt-2">{isLoading ? "—" : rows.length}</p>
          </div>
        </div>

        {overdue > 0 && (
          <div className="mb-4 px-4 py-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-sm">
            <span className="font-bold text-red-400">⚠ Overdue:</span> {formatUSD(overdue)} in bills are past due date. Review and action required.
          </div>
        )}

        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">
              {overdueOnly ? "Overdue Payables" : "All Payables"} ({rows.length} items)
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="p-4">Date</th>
                <th className="p-4">Vendor / Account</th>
                <th className="p-4">Description</th>
                <th className="p-4">Entity</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={6} className="p-6 text-center text-gray-500">Loading...</td></tr>
              : rows.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-gray-500">No payables found. Check account mapping in Supabase.</td></tr>
              : rows.map((r: any, i: number) => {
                const isOverdue = r.due_date && r.due_date < today;
                return (
                  <tr key={i} className={"border-b border-gray-800 hover:bg-gray-800/30 " + (isOverdue ? "bg-red-950/10" : "")}>
                    <td className="p-4 text-gray-400">{r.transaction_date?.slice(0, 10)}</td>
                    <td className="p-4 font-medium">{r.account_name ?? "—"}</td>
                    <td className="p-4 text-gray-400 max-w-xs truncate">{r.description ?? "—"}</td>
                    <td className="p-4"><span className="px-2 py-0.5 rounded text-xs bg-gray-800">{r.entity_id === UK_ENTITY_ID ? "UK" : r.entity_id === EG_ENTITY_ID ? "EG" : "—"}</span></td>
                    <td className="p-4 text-right font-semibold">{formatUSD(r.amount_usd)}</td>
                    <td className="p-4 text-right">
                      {isOverdue ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-900/60 text-red-300">Overdue {r.days_overdue}d</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-900/40 text-amber-300">Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length > 0 && (
                <tr className="bg-gray-800/60 font-semibold">
                  <td colSpan={4} className="p-4">Total</td>
                  <td className="p-4 text-right">{formatUSD(rows.reduce((s: number, r: any) => s + r.amount_usd, 0))}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
