import React, { useState, useRef, useEffect } from "react";

export default function ExplainChip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  return (
    <div ref={ref} className="relative inline-flex">
      <button onClick={()=>setOpen(v=>!v)} className="px-2 py-0.5 text-xs rounded-full ring-1 ring-slate-300 text-slate-600 hover:bg-slate-50">i</button>
      {open && (
        <div className="absolute z-50 mt-2 w-64 rounded-md bg-white p-3 text-sm text-slate-700 shadow-lg ring-1 ring-slate-200">
          {text}
        </div>
      )}
    </div>
  );
}


