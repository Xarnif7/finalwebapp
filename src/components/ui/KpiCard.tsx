import React from "react";

export default function KpiCard({ label, value, delta }: { label: string; value: string | number; delta?: string }) {
  return (
    <div className="elevated-card p-5">
      <div className="text-[15px] text-slate-600">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {delta && <div className="mt-1 text-emerald-600 text-sm">{delta}</div>}
    </div>
  );
}


