import React, { useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import SectionHeader from "@/components/ui/SectionHeader";
import ReviewInbox from "@/pages/ReviewInbox";
import Conversations from "@/pages/Conversations";
import SocialPosts from "@/pages/SocialPosts";

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function InboxPage() {
  const q = useQuery();
  const filter = q.get("filter") || "reviews";
  const [selected, setSelected] = useState<number>(0);
  const items = useMemo(()=>[
    { id: 1, title: '4★ review on Google (Downtown)' },
    { id: 2, title: '1★ Yelp complaint about wait time' },
    { id: 3, title: 'Message: Pricing question from Sarah' },
  ],[]);
  const [checked, setChecked] = useState({});
  const toggle = (id, val) => {
    setChecked(prev=>{ const next = { ...prev, [id]: val ?? !prev[id] }; setSelected(Object.values(next).filter(Boolean).length); return next; });
  };
  const tabs = [
    { key: "reviews", label: "Reviews" },
    { key: "messages", label: "Messages" },
    { key: "social", label: "Social" },
  ];
  return (
    <div className="page">
      <SectionHeader title="Inbox" subtitle="Handle reviews and messages fast." />
      <div className="mb-6 flex items-center gap-4">
        {tabs.map(t => (
          <Link key={t.key} to={`/pro/inbox?filter=${t.key}`} className={`hover-underline pb-1 ${filter===t.key? 'font-semibold text-slate-900 border-b-2 border-[#4BC9F0]':''}`}>{t.label}</Link>
        ))}
      </div>
      {selected > 0 && (
        <div className="mb-4 rounded-xl bg-slate-900 text-white px-4 py-2 flex items-center justify-between">
          <div>{selected} selected</div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg px-3 py-1.5 bg-white/10 hover:bg-white/15">Batch reply</button>
            <button className="rounded-lg px-3 py-1.5 bg-white/10 hover:bg-white/15">Assign</button>
            <button className="rounded-lg px-3 py-1.5 bg-white/10 hover:bg-white/15">Mark done</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-12 gap-5">
        <aside className="col-span-12 lg:col-span-4 space-y-4">
          <div className="elevated-card p-4">
            <div className="text-slate-900 font-semibold mb-3">Folders</div>
            <ul className="space-y-1 text-sm">
              {['All','Needs reply','Assigned to me','Escalated'].map(i=> (
                <li key={i} className="rounded-lg px-3 py-2 hover:bg-slate-50 cursor-pointer">{i}</li>
              ))}
            </ul>
          </div>
          <div className="elevated-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-900 font-semibold">Selection</div>
              <button className="text-xs rounded-lg px-2 py-1 ring-1 ring-slate-200 hover:bg-slate-50" onClick={()=>{ const all = items.reduce((a,i)=>({ ...a, [i.id]: true }),{}); setChecked(all); setSelected(items.length); }}>Select all</button>
            </div>
            <ul className="space-y-2">
              {items.map(item=> (
                <li key={item.id} className="flex items-center justify-between rounded-lg px-3 py-2 ring-1 ring-slate-200 hover:bg-slate-50">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!checked[item.id]} onChange={(e)=>toggle(item.id, e.target.checked)} />
                    <span className="text-sm">{item.title}</span>
                  </label>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-600">
                    <button className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">Assign</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <main className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-2xl ring-1 ring-slate-200">
            {filter === "reviews" && <ReviewInbox />}
            {filter === "messages" && <Conversations />}
            {filter === "social" && <SocialPosts />}
          </div>
        </main>
      </div>
    </div>
  );
}



