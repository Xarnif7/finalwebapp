import React from "react";

export default function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white ring-1 ring-slate-200 shadow-2xl p-6">
        <div className="text-lg font-semibold mb-4">Upgrade plan</div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { name: 'Starter', price: '$29', features: ['1 workspace','Basic automations']},
            { name: 'Growth', price: '$99', features: ['3 workspaces','Autopilot','Reports']},
            { name: 'Scale', price: '$249', features: ['Unlimited','Advanced insights']},
          ].map(t => (
            <div key={t.name} className="rounded-2xl ring-1 ring-slate-200 p-4">
              <div className="font-semibold">{t.name}</div>
              <div className="text-2xl mt-1">{t.price}</div>
              <ul className="mt-2 text-sm text-slate-600 list-disc list-inside">
                {t.features.map(f => <li key={f}>{f}</li>)}
              </ul>
              <button className="mt-3 w-full rounded-xl px-3 py-2 bg-gradient-to-r from-[#7A5FFF] to-[#4BC9F0] text-white">Choose</button>
            </div>
          ))}
        </div>
        <div className="mt-6 text-right"><button className="rounded-xl px-4 py-2 bg-slate-900 text-white" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}


