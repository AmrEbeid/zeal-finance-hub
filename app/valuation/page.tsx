"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import Sidebar from "../../components/Sidebar";
import { formatUSD } from "../../lib/format";

interface DcfRow { id: string; scenario: string; implied_valuation: number; revenue_cagr: number; discount_rate: number; terminal_growth_rate: number; projection_years: number; calculated_at: string; }
interface Assumption { key: string; value: string; label: string; }

function useValuationData() {
  return useQuery({
    queryKey: ["valuation"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) return { dcf: [], assumptions: [] };
      const { data: dcf } = await supabase.from("dcf_valuation").select("*").order("calculated_at", { ascending: false }).limit(10);
      const { data: assumptions } = await supabase.from("valuation_assumptions").select("*");
      return { dcf: (dcf ?? []) as DcfRow[], assumptions: (assumptions ?? []) as Assumption[] };
    },
  });
}

// Sensitivity matrix: 3x3 grid of discount rate vs revenue CAGR
function sensitivityValue(baseVal: number, baseDiscount: number, baseCAGR: number, newDiscount: number, newCAGR: number): number {
  // Simplified: valuation scales inversely with discount, directly with CAGR
  const discountFactor = baseDiscount / newDiscount;
  const cagrFactor = (1 + newCAGR) / (1 + baseCAGR);
  return baseVal * discountFactor * cagrFactor;
}

const DISCOUNT_RATES = [0.08, 0.12, 0.16];
const CAGR_RATES = [0.20, 0.35, 0.50];

export default function ValuationPage() {
  const { data, isLoading } = useValuationData();
  const dcf = data?.dcf ?? [];
  const assumptions = data?.assumptions ?? [];

  const latest = dcf[0];
  const baseVal = latest?.implied_valuation ?? 0;
  const baseDiscount = latest?.discount_rate ?? 0.12;
  const baseCAGR = latest?.revenue_cagr ?? 0.35;

  const getAssumption = (key: string) => assumptions.find((a) => a.key === key)?.value ?? "—";

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Valuation</h1>
            <p className="text-gray-400 text-sm mt-1">DCF model and scenario sensitivity</p>
          </div>
          {latest && (
            <span className="text-xs text-gray-500">Last calculated: {latest.calculated_at?.slice(0, 10)}</span>
          )}
        </div>

        {/* Main valuation card */}
        <div className="bg-indigo-950/40 border border-indigo-800 rounded-xl p-6 mb-6">
          <p className="text-indigo-300 text-xs uppercase tracking-widest mb-2">Implied Valuation (Base Case)</p>
          {isLoading ? (
            <p className="text-4xl font-bold">—</p>
          ) : baseVal > 0 ? (
            <p className="text-5xl font-bold text-white">{formatUSD(baseVal)}</p>
          ) : (
            <p className="text-gray-500">No DCF data yet. Populate the dcf_valuation table in Supabase.</p>
          )}
          {latest && (
            <div className="flex gap-6 mt-4 text-sm text-gray-400">
              <span>Scenario: <span className="text-white">{latest.scenario}</span></span>
              <span>Discount rate: <span className="text-white">{(latest.discount_rate * 100).toFixed(0)}%</span></span>
              <span>Revenue CAGR: <span className="text-white">{(latest.revenue_cagr * 100).toFixed(0)}%</span></span>
              <span>Years: <span className="text-white">{latest.projection_years}</span></span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Assumptions */}
          <div className="bg-gray-900 rounded-xl border border-gray-800">
            <div className="p-4 border-b border-gray-800"><h2 className="text-sm font-semibold text-gray-300">Key Assumptions</h2></div>
            {assumptions.length === 0 ? (
              <p className="p-4 text-gray-500">No assumptions seeded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {assumptions.map((a, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="p-4 text-gray-400">{a.label ?? a.key}</td>
                      <td className="p-4 text-right font-semibold">{a.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Scenario history */}
          <div className="bg-gray-900 rounded-xl border border-gray-800">
            <div className="p-4 border-b border-gray-800"><h2 className="text-sm font-semibold text-gray-300">Scenario History</h2></div>
            {dcf.length === 0 ? (
              <p className="p-4 text-gray-500">No scenarios calculated yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-400 border-b border-gray-800"><th className="p-4">Scenario</th><th className="p-4 text-right">Valuation</th><th className="p-4 text-right">Date</th></tr></thead>
                <tbody>
                  {dcf.map((r, i) => (
                    <tr key={i} className={"border-b border-gray-800 " + (i === 0 ? "bg-indigo-950/20" : "")}>
                      <td className="p-4 font-medium">{r.scenario}{i === 0 && <span className="ml-2 text-xs bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded">Latest</span>}</td>
                      <td className="p-4 text-right font-semibold text-indigo-400">{formatUSD(r.implied_valuation)}</td>
                      <td className="p-4 text-right text-gray-500 text-xs">{r.calculated_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sensitivity matrix */}
        {baseVal > 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300">Sensitivity Analysis</h2>
              <p className="text-xs text-gray-500 mt-1">Implied valuation by discount rate (rows) vs revenue CAGR (columns)</p>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400">
                    <th className="p-3 text-left">Discount \ CAGR</th>
                    {CAGR_RATES.map((c) => <th key={c} className="p-3 text-right">{(c * 100).toFixed(0)}%</th>)}
                  </tr>
                </thead>
                <tbody>
                  {DISCOUNT_RATES.map((d) => (
                    <tr key={d} className="border-t border-gray-800">
                      <td className="p-3 font-medium text-gray-400">{(d * 100).toFixed(0)}%</td>
                      {CAGR_RATES.map((c) => {
                        const val = sensitivityValue(baseVal, baseDiscount, baseCAGR, d, c);
                        const isBase = d === baseDiscount && c === baseCAGR;
                        return (
                          <td key={c} className={"p-3 text-right font-semibold " + (isBase ? "bg-indigo-900/40 text-indigo-300 rounded" : val > baseVal ? "text-emerald-400" : "text-red-400")}>
                            {formatUSD(val)}
                            {isBase && <span className="ml-1 text-xs opacity-60">base</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
