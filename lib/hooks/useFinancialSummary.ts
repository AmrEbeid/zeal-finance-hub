
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";

export const UK_ENTITY_ID = "3ba549af-c7de-4602-a6de-899bbab6667d";
export const EG_ENTITY_ID = "4a524b7f-880a-47ce-bf04-817b288bfec0";
export type EntityFilter = "all" | typeof UK_ENTITY_ID | typeof EG_ENTITY_ID;

export interface FinancialSummary {
  // MTD P&L
  mtdRevenue: number;
  mtdCOGS: number;
  mtdExpenses: number;
  grossProfit: number;
  // MoM%
  momRevenue: number;
  momExpenses: number;
  // YTD
  ytdRevenue: number;
  ytdExpenses: number;
  // Cash
  totalCashUsd: number;
  burnRate: number;
  runwayMonths: number;
  // Headcount
  headcount: number;
  // State
  awaitingDataSync: boolean;
  isLoading: boolean;
}

type JournalRow = {
  entity_id: string | null;
  transaction_date: string;
  account_type: string | null;
  amount_usd: number | null;
};

function sumByType(rows: JournalRow[], type: string): number {
  return rows
    .filter((r) => r.account_type === type)
    .reduce((acc, r) => acc + (Number(r.amount_usd) || 0), 0);
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function useFinancialSummary(entity: EntityFilter = "all") {
  return useQuery<FinancialSummary>({
    queryKey: ["financial-summary", entity],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) {
        return emptyResult(true);
      }

      const now = new Date();
      const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const ytdStart = new Date(now.getFullYear(), 0, 1);
      const prevMonthSameDay = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // ── Check if data exists ──────────────────────────────────────────────
      let countQ = supabase.from("journal_entries").select("id", { count: "exact", head: true });
      if (entity !== "all") countQ = countQ.eq("entity_id", entity);
      const { count } = await countQ;
      const awaitingDataSync = (count ?? 0) === 0;

      // ── Fetch MTD rows ────────────────────────────────────────────────────
      let mtdQ = supabase
        .from("journal_entries")
        .select("entity_id, transaction_date, account_type, amount_usd")
        .gte("transaction_date", dateStr(mtdStart))
        .lte("transaction_date", dateStr(now));
      if (entity !== "all") mtdQ = mtdQ.eq("entity_id", entity);
      const { data: mtdRows = [], error: e1 } = await mtdQ;
      if (e1) throw e1;

      // ── Fetch MTDP rows (previous month, same day range) ─────────────────
      let mtdpQ = supabase
        .from("journal_entries")
        .select("entity_id, transaction_date, account_type, amount_usd")
        .gte("transaction_date", dateStr(prevMonthStart))
        .lte("transaction_date", dateStr(prevMonthSameDay));
      if (entity !== "all") mtdpQ = mtdpQ.eq("entity_id", entity);
      const { data: mtdpRows = [], error: e2 } = await mtdpQ;
      if (e2) throw e2;

      // ── Fetch YTD rows ────────────────────────────────────────────────────
      let ytdQ = supabase
        .from("journal_entries")
        .select("entity_id, transaction_date, account_type, amount_usd")
        .gte("transaction_date", dateStr(ytdStart))
        .lte("transaction_date", dateStr(now));
      if (entity !== "all") ytdQ = ytdQ.eq("entity_id", entity);
      const { data: ytdRows = [], error: e3 } = await ytdQ;
      if (e3) throw e3;

      // ── P&L calculations (sign conventions match Power BI DAX) ───────────
      // Income: positive as-is  (sign_convention = +1)
      // Expenses/COGS: QB stores positive → negate for P&L display (sign_convention = -1)
      const mtdRevenue  = sumByType(mtdRows as JournalRow[], "Income");
      const mtdCOGS     = sumByType(mtdRows as JournalRow[], "COGS");          // keep positive for gross profit calc
      const mtdExpenses = sumByType(mtdRows as JournalRow[], "Expense");       // keep positive for burn calc
      const grossProfit = mtdRevenue - mtdCOGS;

      const mtdpRevenue  = sumByType(mtdpRows as JournalRow[], "Income");
      const mtdpExpenses = sumByType(mtdpRows as JournalRow[], "Expense")
                         + sumByType(mtdpRows as JournalRow[], "COGS");

      const momRevenue  = mtdpRevenue  !== 0 ? (mtdRevenue  - mtdpRevenue)  / mtdpRevenue  : 0;
      const momExpenses = mtdpExpenses !== 0 ? ((mtdExpenses + mtdCOGS) - mtdpExpenses) / mtdpExpenses : 0;

      const ytdRevenue  = sumByType(ytdRows as JournalRow[], "Income");
      const ytdExpenses = sumByType(ytdRows as JournalRow[], "Expense")
                        + sumByType(ytdRows as JournalRow[], "COGS");

      // Burn Rate = monthly cash out - monthly cash in (positive = burning)
      const burnRate = Math.max(0, mtdExpenses + mtdCOGS - mtdRevenue);

      // ── Cash positions (column is "balance" not "balance_usd") ────────────
      let cashQ = supabase.from("cash_positions").select("balance, currency");
      if (entity !== "all") cashQ = cashQ.eq("entity_id", entity);
      const { data: cashRows = [], error: e4 } = await cashQ;
      if (e4) throw e4;
      const totalCashUsd = (cashRows as { balance: number | null; currency: string | null }[])
        .reduce((acc, r) => acc + (Number(r.balance) || 0), 0);

      // ── Runway: from runway_snapshots (snapshot_date column) ─────────────
      const { data: runway } = await supabase
        .from("runway_snapshots")
        .select("runway_months, monthly_burn_usd, total_cash_usd")
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const runwayMonths =
        runway?.runway_months != null
          ? Number(runway.runway_months)
          : burnRate > 0
          ? totalCashUsd / burnRate
          : 0;

      // ── Headcount (headcount table: employee_id + status + period_month) ─
      const hcMonthStart = dateStr(new Date(now.getFullYear(), now.getMonth(), 1));
      let hcQ = supabase
        .from("headcount")
        .select("employee_id, status")
        .eq("period_month", hcMonthStart);
      if (entity !== "all") hcQ = hcQ.eq("entity_id", entity);
      const { data: hcRows = [] } = await hcQ;
      const headcount = (hcRows as { employee_id: string | null; status: string | null }[])
        .filter((r) => r.status === "active")
        .length;

      return {
        mtdRevenue,
        mtdCOGS,
        mtdExpenses,
        grossProfit,
        momRevenue,
        momExpenses,
        ytdRevenue,
        ytdExpenses,
        totalCashUsd,
        burnRate,
        runwayMonths,
        headcount,
        awaitingDataSync,
        isLoading: false,
      };
    },
  });
}

function emptyResult(awaitingDataSync: boolean): FinancialSummary {
  return {
    mtdRevenue: 0, mtdCOGS: 0, mtdExpenses: 0, grossProfit: 0,
    momRevenue: 0, momExpenses: 0,
    ytdRevenue: 0, ytdExpenses: 0,
    totalCashUsd: 0, burnRate: 0, runwayMonths: 0,
    headcount: 0, awaitingDataSync, isLoading: false,
  };
}
