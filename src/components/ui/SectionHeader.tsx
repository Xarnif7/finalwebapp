import React from "react";

export default function SectionHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4 page">
      <div>
        <h1 className="text-[28px] sm:text-[32px] leading-8 font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-2 text-slate-600 text-[15px]">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}


