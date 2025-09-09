import React from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import AutomatedRequests from "@/pages/AutomatedRequests";

export default function AutopilotPage() {
  return (
    <div className="page">
      <SectionHeader title="Autopilot" subtitle="Tell Blipp how to drive—once." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="elevated-card p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900">Simple Mode</div>
              <button className="rounded-xl px-3 py-1.5 bg-slate-900 text-white">Save</button>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { name: 'Learning Mode', helper: 'Let Blipp test copy and timing safely.' },
                { name: 'Safety & Rollback', helper: 'Automatic rollback on errors.' },
                { name: 'Kill Switch', helper: 'Stop all sends instantly.' },
              ].map(o => (
                <label key={o.name} className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1" defaultChecked />
                  <span>
                    <div className="font-medium">{o.name}</div>
                    <div className="text-sm text-slate-600">{o.helper}</div>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl ring-1 ring-slate-200">
            <AutomatedRequests />
          </div>
        </div>
        <aside className="space-y-4">
          <div className="elevated-card p-5">
            <div className="font-semibold text-slate-900 mb-2">Status</div>
            <div className="text-sm text-slate-600">Sequences: On • Last send: 2h ago</div>
          </div>
          <div className="elevated-card p-5">
            <div className="font-semibold text-slate-900 mb-2">Kill Switch</div>
            <button className="rounded-xl px-3 py-2 bg-[#EF4444] text-white w-full">Stop All Sends</button>
          </div>
        </aside>
      </div>
    </div>
  );
}


