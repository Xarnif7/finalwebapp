import React from "react";

export default function PanelCard({ title, actions, children }: { title?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="elevated-card p-5">
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="font-semibold text-slate-900">{title}</div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}


