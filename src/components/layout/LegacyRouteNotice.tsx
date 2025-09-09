import React, { useEffect, useState } from "react";

export default function LegacyRouteNotice({ target }: { target: string }) {
  const key = `legacy_notice_${target}`;
  const [show, setShow] = useState(false);
  useEffect(() => {
    const ts = localStorage.getItem(key);
    if (!ts) setShow(true);
  }, [key]);
  if (!show) return null;
  const dismiss = () => {
    localStorage.setItem(key, String(Date.now()));
    setShow(false);
  };
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] rounded-xl bg-slate-900 text-white px-4 py-2 shadow-lg">
      Heads up: this page moved to {target}. We redirected you automatically.
      <button onClick={dismiss} className="ml-3 underline">Dismiss</button>
    </div>
  );
}


