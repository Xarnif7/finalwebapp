import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/utils';

type StatDeltaProps = {
  value: number; // percentage, e.g., +12 or -8
  className?: string;
};

export function StatDelta({ value, className }: StatDeltaProps) {
  const isUp = value >= 0;
  const formatted = `${isUp ? '+' : ''}${value}%`;
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
        className,
      )}
    >
      {isUp ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      <span>{formatted}</span>
    </div>
  );
}

export default StatDelta;


