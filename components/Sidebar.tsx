
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",           label: "Control Center",   icon: "⚡" },
  { href: "/pnl",        label: "P&L Statement",    icon: "📊" },
  { href: "/revenue",    label: "Revenue",           icon: "💹" },
  { href: "/cash",       label: "Cash & Runway",     icon: "🏦" },
  { href: "/budget",     label: "Budget vs Actual",  icon: "🎯" },
  { href: "/payroll",    label: "Payroll Hub",       icon: "👥" },
  { href: "/payables",   label: "Payables",          icon: "📋" },
  { href: "/fx",         label: "FX & Currency",     icon: "💱" },
  { href: "/valuation",  label: "Valuation",         icon: "🏢" },
  { href: "/settings",   label: "Settings",          icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-zinc-800 bg-zinc-950 px-3 py-6">
      <div className="mb-8 px-2">
        <div className="text-lg font-bold tracking-tight text-white">Zeal Finance</div>
        <div className="text-xs text-zinc-500">CFO Dashboard</div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all " +
                (active
                  ? "bg-indigo-600/20 text-indigo-400 font-medium"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100")
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-2 text-xs text-zinc-600">
        Powered by QuickBooks → n8n → Supabase
      </div>
    </aside>
  );
}
