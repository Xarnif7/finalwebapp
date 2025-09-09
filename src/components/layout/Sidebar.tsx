import React from "react";
import * as Icons from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { NAV } from "@/lib/nav/schema";
import { useFeatureFlags } from "@/lib/featureFlags";

export default function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { pathname } = useLocation();
  const flags = useFeatureFlags();
  const renderItem = (label: string, icon: string, to: string) => {
    const I = (Icons as any)[icon] || Icons.Circle;
    const active = pathname.startsWith(to) || pathname === to;
    const badge = label === 'Inbox' ? 3 : 0; // placeholder count
    return (
      <Link key={to} to={"/pro" + to} className={
        "relative group flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-200 " +
        (active ? "bg-gradient-to-r from-[#7A5FFF] to-[#FF7A59] text-white ring-0"
                : "text-slate-700 hover:bg-white ring-1 ring-transparent hover:ring-slate-200 hover:translate-x-[2px]")
      } title={label}>
        {active && <span className="absolute right-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#7A5FFF] to-[#FF7A59] rounded-r-xl" />}
        <I className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" /> {!collapsed && <span>{label}</span>}
        {!collapsed && badge > 0 && <span className="ml-auto text-xs rounded-full px-2 py-0.5 bg-slate-100 text-slate-700">{badge}</span>}
      </Link>
    );
  };

  const workspace = NAV.filter(n => n.section === 'workspace');
  const admin = NAV.filter(n => n.section === 'admin');
  const isOn = (n: any) => !n.featureFlag || (flags as any)[n.featureFlag];

  return (
    <nav className="sticky top-20 space-y-4">
      <div className="space-y-1">
        {workspace.filter(isOn).map(n => renderItem(n.label, n.icon, n.path))}
      </div>
      <div className="pt-2 text-xs font-semibold text-slate-500">Admin</div>
      <div className="space-y-1">
        {admin.filter(isOn).map(n => renderItem(n.label, n.icon, n.path))}
      </div>
    </nav>
  );
}


