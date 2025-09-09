import React from "react";

export default function ShortcutsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white ring-1 ring-slate-200 shadow-2xl p-6">
        <div className="text-lg font-semibold mb-4">Keyboard shortcuts</div>
        <ul className="space-y-2 text-sm text-slate-700">
          <li><kbd className="rounded px-1 py-0.5 bg-slate-100 ring-1 ring-slate-200">/</kbd> Focus search</li>
          <li><kbd className="rounded px-1 py-0.5 bg-slate-100 ring-1 ring-slate-200">?</kbd> Toggle this help</li>
          <li><kbd className="rounded px-1 py-0.5 bg-slate-100 ring-1 ring-slate-200">Esc</kbd> Close overlays</li>
          <li>↑ / ↓ Navigate lists</li>
          <li>Enter Open</li>
        </ul>
        <div className="mt-6 text-right"><button onClick={onClose} className="rounded-xl px-4 py-2 bg-slate-900 text-white">Close</button></div>
      </div>
    </div>
  );
}


