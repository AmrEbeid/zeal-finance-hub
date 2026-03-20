"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { UK_ENTITY_ID, EG_ENTITY_ID } from "../../lib/hooks/useFinancialSummary";
import Sidebar from "../../components/Sidebar";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Entity { id: string; name: string; country: string; currency: string; }
interface AccountMapping { id: string; account_name: string; account_type: string; department: string; }

function useSettingsData() {
  return useQuery({
    queryKey: ["settings"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!supabase) return { entities: [], mappings: [], user: null, lastSync: null };
      const { data: { user } } = await supabase.auth.getUser();
      const { data: entities } = await supabase.from("entities").select("*");
      const { data: mappings } = await supabase.from("account_mapping").select("*").order("account_type").limit(50);
      const { data: sync } = await supabase.from("integration_runs").select("ran_at, status").order("ran_at", { ascending: false }).limit(1);
      return {
        entities: (entities ?? []) as Entity[],
        mappings: (mappings ?? []) as AccountMapping[],
        user,
        lastSync: sync?.[0] ?? null,
      };
    },
  });
}

export default function SettingsPage() {
  const { data, isLoading } = useSettingsData();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const user = data?.user;
  const entities = data?.entities ?? [];
  const mappings = data?.mappings ?? [];
  const lastSync = data?.lastSync as any;

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || newPassword.length < 6) { setPwMsg("Password must be at least 6 characters."); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    setPwMsg(error ? "Error: " + error.message : "Password updated successfully.");
    setNewPassword("");
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-gray-400 text-sm mt-1">Account, entities, and data source configuration</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* User profile */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Your Profile</h2>
            {isLoading ? <p className="text-gray-500">Loading...</p> : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="font-medium mt-1">{user?.email ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Role</p>
                  <span className="mt-1 inline-block px-2 py-0.5 rounded text-xs bg-indigo-900/60 text-indigo-300 font-semibold">
                    {user?.user_metadata?.role ?? "user"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">User ID</p>
                  <p className="font-mono text-xs text-gray-500 mt-1">{user?.id ?? "—"}</p>
                </div>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="mt-6 pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-400 mb-2">Change Password</p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
              {pwMsg && <p className={"text-xs mt-2 " + (pwMsg.startsWith("Error") ? "text-red-400" : "text-emerald-400")}>{pwMsg}</p>}
            </form>
          </div>

          {/* Data sources */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Data Sources</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-800/60 rounded-lg">
                <div>
                  <p className="font-medium text-sm">QuickBooks</p>
                  <p className="text-xs text-gray-500 mt-0.5">journal_entries via n8n workflow</p>
                </div>
                <span className={"px-2 py-0.5 rounded text-xs font-medium " + (lastSync ? "bg-emerald-900/60 text-emerald-300" : "bg-gray-700 text-gray-400")}>
                  {lastSync ? "Connected" : "Pending"}
                </span>
              </div>
              {lastSync && (
                <p className="text-xs text-gray-500">Last sync: {lastSync.ran_at?.slice(0, 19)?.replace("T", " ")} — {lastSync.status}</p>
              )}
              <div className="flex items-center justify-between p-3 bg-gray-800/60 rounded-lg">
                <div>
                  <p className="font-medium text-sm">SharePoint Budget Model</p>
                  <p className="text-xs text-gray-500 mt-0.5">Financial Model.xlsx via n8n</p>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-900/40 text-amber-300">Setup needed</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800/60 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Supabase</p>
                  <p className="text-xs text-gray-500 mt-0.5">Project: duorcaztiksatsskzkss</p>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/60 text-emerald-300">Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Entities */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 mb-4">
          <div className="p-4 border-b border-gray-800"><h2 className="text-sm font-semibold text-gray-300">Entities</h2></div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-400 border-b border-gray-800"><th className="p-4">Name</th><th className="p-4">Country</th><th className="p-4">Currency</th><th className="p-4">ID</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={4} className="p-4 text-gray-500">Loading...</td></tr>
              : entities.length === 0 ? (
                <>
                  <tr className="border-b border-gray-800"><td className="p-4 font-medium">Zeal IO Ltd</td><td className="p-4 text-gray-400">UK</td><td className="p-4"><span className="px-2 py-0.5 rounded text-xs bg-gray-800">GBP</span></td><td className="p-4 font-mono text-xs text-gray-500">{UK_ENTITY_ID}</td></tr>
                  <tr className="border-b border-gray-800"><td className="p-4 font-medium">Zeal IO Egypt</td><td className="p-4 text-gray-400">Egypt</td><td className="p-4"><span className="px-2 py-0.5 rounded text-xs bg-gray-800">EGP</span></td><td className="p-4 font-mono text-xs text-gray-500">{EG_ENTITY_ID}</td></tr>
                </>
              ) : entities.map((e, i) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="p-4 font-medium">{e.name}</td>
                  <td className="p-4 text-gray-400">{e.country}</td>
                  <td className="p-4"><span className="px-2 py-0.5 rounded text-xs bg-gray-800">{e.currency}</span></td>
                  <td className="p-4 font-mono text-xs text-gray-500">{e.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Account mapping */}
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="p-4 border-b border-gray-800"><h2 className="text-sm font-semibold text-gray-300">Account Mapping (first 50)</h2></div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-400 border-b border-gray-800"><th className="p-4">Account Name</th><th className="p-4">Type</th><th className="p-4">Department</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={3} className="p-4 text-gray-500">Loading...</td></tr>
              : mappings.length === 0 ? <tr><td colSpan={3} className="p-4 text-gray-500">No mappings found.</td></tr>
              : mappings.map((m, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30">
                  <td className="p-4">{m.account_name}</td>
                  <td className="p-4"><span className={"px-2 py-0.5 rounded text-xs " + (m.account_type === "Income" ? "bg-emerald-900/40 text-emerald-300" : m.account_type === "Expense" ? "bg-red-900/40 text-red-300" : "bg-gray-800 text-gray-400")}>{m.account_type}</span></td>
                  <td className="p-4 text-gray-400">{m.department ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
