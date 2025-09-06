import React from 'react';
import { Card } from './card';
import { cn } from '../../lib/utils';
import { theme } from '../../design/theme';

type KpiTileProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

export function KpiTile({ title, value, subtitle, icon, rightSlot, className, children }: KpiTileProps) {
  return (
    <Card
      className={cn(
        'transition-transform duration-200 will-change-transform',
        'bg-white/70 backdrop-blur border border-slate-200',
        'hover:-translate-y-[2px] hover:shadow-lg',
        className,
      )}
      style={{ borderRadius: theme.radii.card, boxShadow: theme.shadows.card }}
    >
      <div className="p-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="rounded-xl p-3 bg-slate-100 text-slate-700">{icon}</div>
          )}
          <div>
            <div className="text-slate-500 text-sm font-medium">{title}</div>
            <div className="text-3xl font-semibold tracking-tight mt-1">{value}</div>
            {subtitle && <div className="text-slate-500 text-xs mt-1">{subtitle}</div>}
            {children}
          </div>
        </div>
        {rightSlot}
      </div>
    </Card>
  );
}

export default KpiTile;


