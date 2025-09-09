import React from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import ReviewPerformance from "@/pages/ReviewPerformance";
import RevenueImpact from "@/pages/RevenueImpact";
import Competitors from "@/pages/Competitors";
import { useLocation, Link } from "react-router-dom";
import { useFeatureFlags } from "@/lib/featureFlags";
import { useState } from "react";
import LazyMount from "@/components/ui/LazyMount";
import { ChartSkeleton } from "@/components/ui/Skeletons";

function useQuery() { const { search } = useLocation(); return new URLSearchParams(search); }

export default function InsightsPage() {
  const q = useQuery();
  const view = q.get('view') || 'performance';
  const flags = useFeatureFlags();
  const tabs = [
    { key: 'performance', label: 'Performance' },
    { key: 'reports', label: 'Reports' },
    ...(flags.competitors ? [{ key: 'competitors', label: 'Competitors' }] : [])
  ];
  const [replyTime, setReplyTime] = useState(90);
  const [volume, setVolume] = useState(100);
  return (
    <div className="page">
      <SectionHeader title="Insights" subtitle="Explain what’s working; change it in one tap." />
      <div className="mb-6 flex items-center gap-2">
        {tabs.map(t => (
          <Link key={t.key} to={`/pro/insights?view=${t.key}`} className={`hover-underline pb-1 ${view===t.key? 'font-semibold text-slate-900 border-b-2 border-[#4BC9F0]':''}`}>{t.label}</Link>
        ))}
      </div>
      <div className="bg-white rounded-2xl ring-1 ring-slate-200">
        {view==='performance' && (
          <LazyMount placeholder={<ChartSkeleton />}>
            <ReviewPerformance />
          </LazyMount>
        )}
        {view==='reports' && (
          <LazyMount placeholder={<ChartSkeleton />}>
            <RevenueImpact />
          </LazyMount>
        )}
        {view==='competitors' && flags.competitors && (
          <LazyMount placeholder={<ChartSkeleton />}>
            <Competitors />
          </LazyMount>
        )}
        {view==='competitors' && !flags.competitors && <div className="p-6 text-slate-700">Competitors is coming soon.</div>}
      </div>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="elevated-card p-5 lg:col-span-2">
          <div className="font-semibold text-slate-900 mb-3">What‑If</div>
          <div className="flex items-center gap-4">
            <label className="flex-1">Reply time (mins)
              <input type="range" min="10" max="240" value={replyTime} onChange={e=>setReplyTime(parseInt(e.target.value))} className="w-full" />
            </label>
            <label className="flex-1">Request volume (% of baseline)
              <input type="range" min="50" max="200" value={volume} onChange={e=>setVolume(parseInt(e.target.value))} className="w-full" />
            </label>
          </div>
        </div>
        <div className="elevated-card p-5">
          <div className="font-semibold text-slate-900 mb-2">Narrative</div>
          <div className="text-sm text-slate-700">If reply time is {replyTime}m and request volume is {volume}%, expect <span className="font-semibold">higher response rates</span> and <span className="font-semibold">faster resolution</span>. Apply tweaks on the Requests and Inbox pages.</div>
        </div>
      </div>
    </div>
  );
}


