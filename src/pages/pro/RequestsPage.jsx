import React, { useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import SendRequests from "@/pages/SendRequests";
import DevicePreview from "@/components/ui/DevicePreview";

export default function RequestsPage() {
  const [variant, setVariant] = useState<'A'|'B'>('A');
  return (
    <div className="page">
      <SectionHeader title="Requests" subtitle="Always-on invites with smart timing and split." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="elevated-card p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900">Device Preview</div>
              <div className="flex items-center gap-2 text-sm">
                <button onClick={()=>setVariant('A')} className={`px-3 py-1.5 rounded-xl ring-1 ${variant==='A'?'bg-slate-900 text-white ring-slate-900':'bg-white ring-slate-200 hover:bg-slate-50'}`}>A</button>
                <button onClick={()=>setVariant('B')} className={`px-3 py-1.5 rounded-xl ring-1 ${variant==='B'?'bg-slate-900 text-white ring-slate-900':'bg-white ring-slate-200 hover:bg-slate-50'}`}>B</button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <DevicePreview kind="sms" variant={variant} />
              <DevicePreview kind="email" variant={variant} />
            </div>
          </div>
          <div className="bg-white rounded-2xl ring-1 ring-slate-200">
            <SendRequests />
          </div>
        </div>
        <aside className="space-y-4">
          <div className="elevated-card p-5">
            <div className="font-semibold text-slate-900 mb-2">Distribution</div>
            <div className="rounded-xl ring-1 ring-slate-200 h-48" />
          </div>
          <div className="elevated-card p-5">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked />
              Use best times
            </label>
          </div>
        </aside>
      </div>
    </div>
  );
}


