import React from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import Clients from "@/pages/Clients";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/Toast";
import ExplainChip from "@/components/ui/ExplainChip";
import LazyMount from "@/components/ui/LazyMount";
import { TableSkeleton } from "@/components/ui/Skeletons";

export default function CustomersPage() {
  const { push } = useToast();
  return (
    <div>
      <SectionHeader title="Customers" subtitle="Import once; Blipp handles the rest." actions={
        <div className="flex items-center gap-2">
          <input placeholder="Search…" className="hidden sm:block rounded-xl px-3 py-2 ring-1 ring-slate-200 bg-white" />
          <button onClick={()=>push({ type:'success', message:'Import started' })} className="px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-white hover:bg-slate-50">Import CSV</button>
          <Link to="/clients" className="px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-white hover:bg-slate-50">Add Customer</Link>
        </div>
      } />
      <div className="mb-3 text-sm text-slate-600 flex items-center gap-2">
        Consent column <ExplainChip text="If consent is true, you can safely publish quotes in widgets and ads. Otherwise, only internal use." />
      </div>
      <div className="bg-white rounded-2xl ring-1 ring-slate-200">
        <LazyMount placeholder={<TableSkeleton />}>
          <Clients />
        </LazyMount>
      </div>
    </div>
  );
}


