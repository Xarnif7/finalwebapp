import React from 'react';
import { cn } from '../../lib/utils';

type FilterPillProps = {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
};

export function FilterPill({ active, children, onClick, className }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-sm transition-colors',
        active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
        className,
      )}
    >
      {children}
    </button>
  );
}

export default FilterPill;


