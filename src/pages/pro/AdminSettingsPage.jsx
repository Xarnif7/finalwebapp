import React from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import Settings from "@/pages/Settings";

export default function AdminSettingsPage() {
  return (
    <div className="page">
      <SectionHeader title="Settings" subtitle="Manage workspace preferences and connections." />
      <div className="bg-white rounded-2xl ring-1 ring-slate-200">
        <Settings />
      </div>
      <div className="sticky bottom-4 mt-4 flex justify-end">
        <button className="rounded-xl px-4 py-2 bg-slate-900 text-white shadow">Save changes</button>
      </div>
    </div>
  );
}


