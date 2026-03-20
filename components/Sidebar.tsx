"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp, BarChart2, Landmark, Target, Users, CreditCard, Globe, LineChart, Settings, LogOut } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/",          label: "Control Center",  icon: LayoutDashboard },
  { href: "/pnl",       label: "P&L Statement",   icon: TrendingUp      },
  { href: "/revenue",   label: "Revenue",          icon: BarChart2       },
  { href: "/cash",      label: "Cash & Runway",    icon: Landmark        },
  { href: "/budget",    label: "Budget vs Actual", icon: Target          },
  { href: "/payroll",   label: "Payroll Hub",      icon: Users           },
  { href: "/payables",  label: "Payables",         icon: CreditCard      },
  { href: "/fx",        label: "FX & Currency",    icon: Globe           },
  { href: "/valuation", label: "Valuation",        icon: LineChart       },
  { href: "/settings",  label: "Settings",         icon: Settings        },
];

const BUILT = new Set(["/", "/pnl", "/revenue", "/cash", "/budget", "/payroll", "/payables", "/fx", "/valuation", "/settings"]);

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
  }
  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-screen">
      <div className="px-4 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center"><span className="text-white font-bold text-xs">Z</span></div>
          <div><p className="text-white font-semibold text-sm">Zeal Finance OS</p><p className="text-gray-500 text-xs">Finance Control Center</p></div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const built = BUILT.has(href);
          return (
            <Link key={href} href={built ? href : "#"} className={"flex items-center gap-2.5 px-4 py-2 mx-2 rounded-lg text-sm transition-colors " + (active ? "bg-indigo-600 text-white" : !built ? "text-gray-600 cursor-not-allowed pointer-events-none" : "text-gray-400 hover:text-white hover:bg-gray-800")}>
              <Icon size={15} />
              <span>{label}</span>
              {!built && <span className="ml-auto text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">Soon</span>}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <button onClick={handleSignOut} className="flex items-center gap-2 text-gray-500 hover:text-red-400 text-sm w-full px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          <LogOut size={14} />Sign out
        </button>
      </div>
    </aside>
  );
}
