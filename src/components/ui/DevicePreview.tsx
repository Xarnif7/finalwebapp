import React from "react";

export default function DevicePreview({ kind, variant }: { kind: 'sms' | 'email'; variant?: string }) {
  if (kind === 'sms') {
    return (
      <div className="mx-auto w-full max-w-[260px] h-64 rounded-[32px] ring-1 ring-slate-200 bg-slate-900/95 text-white p-4 relative overflow-hidden">
        <div className="absolute left-1/2 top-1 -translate-x-1/2 w-24 h-1.5 rounded-full bg-white/20" />
        <div className="mt-6 text-xs opacity-70">SMS {variant ? `• Variant ${variant}` : ''}</div>
        <div className="mt-2 rounded-xl bg-white text-slate-900 p-2 text-sm">Hey! Mind leaving a quick review? It really helps.</div>
        <div className="mt-2 rounded-xl bg-[#7A5FFF] text-white p-2 text-sm w-24 text-center">Open</div>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-[320px] h-64 rounded-xl ring-1 ring-slate-200 bg-white p-3">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="mt-3 h-5 w-40 rounded bg-slate-200" />
      <div className="mt-3 h-24 rounded bg-slate-100" />
      <div className="mt-3 h-8 w-28 rounded bg-gradient-to-r from-[#7A5FFF] to-[#4BC9F0]" />
    </div>
  );
}


