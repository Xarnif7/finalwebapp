import React from "react";

export function shimmerClass() { return "animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]"; }

export function CardSkeleton() {
  return <div className={`rounded-2xl h-28 ${shimmerClass()}`} />;
}

export function TableSkeleton() {
  return (
    <div className="rounded-2xl ring-1 ring-slate-200 overflow-hidden">
      {[...Array(5)].map((_,i)=>(<div key={i} className={`h-10 ${shimmerClass()}`} />))}
    </div>
  );
}

export function ChartSkeleton() {
  return <div className={`rounded-2xl h-56 ${shimmerClass()}`} />;
}


