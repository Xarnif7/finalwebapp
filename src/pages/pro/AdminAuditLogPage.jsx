import React from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import AuditLog from "@/pages/AuditLog";

export default function AdminAuditLogPage() {
  return (
    <div className="page">
      <SectionHeader title="Audit Log" subtitle="Track sensitive changes and actions." />
      <div className="bg-white rounded-2xl ring-1 ring-slate-200">
        <AuditLog />
      </div>
    </div>
  );
}


