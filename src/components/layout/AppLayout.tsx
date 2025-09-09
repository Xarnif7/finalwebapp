import React, { PropsWithChildren, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import "@/styles/aurora.css";

export default function AppLayout({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Aurora background layer */}
      <div aria-hidden className="aurora-bg" />

      <Topbar onToggleSidebar={() => setCollapsed(!collapsed)} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-12 gap-8 pt-6">
        <aside className={collapsed ? "hidden lg:block col-span-2" : "col-span-12 md:col-span-3 lg:col-span-2"}>
          <Sidebar collapsed={collapsed} />
        </aside>
        <main className="col-span-12 md:col-span-9 lg:col-span-10 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}


