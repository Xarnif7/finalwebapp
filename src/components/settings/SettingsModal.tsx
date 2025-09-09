import React, { useState } from "react";
import { useConnections } from "@/lib/state/connections";

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, set } = useConnections();
  if (!open) return null;
  const toggle = (k: 'google'|'sms'|'email') => set({ [k]: !(data?.[k] as boolean) } as any);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white ring-1 ring-slate-200 shadow-2xl p-6">
        <div className="text-lg font-semibold mb-4">Settings</div>
        <div>
          <div className="font-medium mb-2">Connections</div>
          <div className="space-y-3">
            <button className={`w-full rounded-xl px-4 py-2 ring-1 ${data?.google? 'bg-emerald-50 ring-emerald-200':'bg-white ring-slate-200'}`} onClick={() => toggle('google')}>
              {data?.google? 'Disconnect Google' : 'Connect Google'}
            </button>
            <button className={`w-full rounded-xl px-4 py-2 ring-1 ${data?.sms? 'bg-emerald-50 ring-emerald-200':'bg-white ring-slate-200'}`} onClick={() => toggle('sms')}>
              {data?.sms? 'Disconnect SMS' : 'Connect SMS'}
            </button>
            <button className={`w-full rounded-xl px-4 py-2 ring-1 ${data?.email? 'bg-emerald-50 ring-emerald-200':'bg-white ring-slate-200'}`} onClick={() => toggle('email')}>
              {data?.email? 'Disconnect Email' : 'Connect Email'}
            </button>
          </div>
        </div>
        <div className="mt-6 text-right"><button className="rounded-xl px-4 py-2 bg-slate-900 text-white" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}


