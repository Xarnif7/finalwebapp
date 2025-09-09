import React from "react";
import { useConnections } from "@/lib/state/connections";

export default function ConnectGate({ needed, children }: { needed: 'google' | 'sms' | 'email' | 'commerce'; children: React.ReactNode }) {
  const { data } = useConnections();
  const ok = (data as any)?.[needed];
  if (ok) return <>{children}</>;
  return (
    <div className="rounded-2xl border border-slate-200 p-6 bg-white text-center">
      <div className="text-slate-900 font-semibold mb-1">Connect to enable</div>
      <p className="text-slate-600 text-sm">This panel requires a {needed} connection.</p>
      <div className="mt-3 inline-flex items-center rounded-xl bg-slate-900 text-white px-4 py-2">Open Settings</div>
    </div>
  );
}


