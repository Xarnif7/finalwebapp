import React from "react";

export default function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="elevated-card p-5">
      <div className="text-[13px] text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-slate-500 text-sm">{hint}</div>}
    </div>
  );
}


