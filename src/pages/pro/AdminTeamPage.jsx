import React from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import TeamRoles from "@/pages/TeamRoles";

export default function AdminTeamPage() {
  return (
    <div className="page">
      <SectionHeader title="Team & Roles" subtitle="Manage members, roles and permissions." />
      <div className="bg-white rounded-2xl ring-1 ring-slate-200">
        <TeamRoles />
      </div>
    </div>
  );
}


