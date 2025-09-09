import React from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import KpiCard from "@/components/ui/KpiCard";
import GlowCard from "@/components/ui/GlowCard";
import StatCard from "@/components/ui/StatCard";
import PanelCard from "@/components/ui/PanelCard";
import LazyMount from "@/components/ui/LazyMount";
import { ChartSkeleton } from "@/components/ui/Skeletons";

export default function HomePage() {
  return (
    <div className="page">
      <SectionHeader title="Today" subtitle="What to do now, and one-tap fixes." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <KpiCard label="Reviews (7d)" value="184" delta="+12%" />
        <KpiCard label="Avg Rating" value="4.6" delta="+0.2" />
        <KpiCard label="Reply Time" value="1h 42m" delta="-27m" />
      </div>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <PanelCard title="Performance overview">
            <LazyMount placeholder={<ChartSkeleton />}> 
              <div className="rounded-xl ring-1 ring-slate-200 h-64" />
            </LazyMount>
          </PanelCard>
          <div className="mt-5">
            <GlowCard>
              <div className="flex items-center justify-between">
                <div className="text-slate-900 font-semibold">Action Queue</div>
                <button className="rounded-xl px-3 py-1.5 bg-slate-900 text-white">Open Inbox</button>
              </div>
              <ul className="mt-4 space-y-2">
                {["Reply to 4★ review (Downtown)", "Escalate 1★ complaint (Yelp)", "Request 20 reviews from last buyers"].map((t)=> (
                  <li key={t} className="flex items-center justify-between rounded-xl ring-1 ring-slate-200 px-3 py-2 bg-white">
                    <span>{t}</span>
                    <button className="text-sm rounded-lg px-2 py-1 bg-slate-900 text-white">Do now</button>
                  </li>
                ))}
              </ul>
            </GlowCard>
          </div>
        </div>
        <div className="space-y-4">
          <StatCard label="Autopilot" value="On" hint="Sequences running" />
          <StatCard label="Trust Health" value="86" hint="Composite score" />
          <StatCard label="Best Send Times" value="6–8pm" hint="Local timezone" />
        </div>
      </div>
    </div>
  );
}


