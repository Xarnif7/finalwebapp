import React from 'react';
import { Badge } from '@/components/ui/badge';

export type Thread = {
  id: string;
  customer_name: string;
  email?: string;
  rating?: number | null;
  latest_at: string;
  flags: { detractor?: boolean; urgent?: boolean; missed?: boolean };
};

type Props = {
  items: Thread[];
  onSelect: (id: string) => void;
  selectedId?: string;
};

export default function ThreadList({ items, onSelect, selectedId }: Props) {
  return (
    <div className="space-y-2">
      {items.map((t) => (
        <div key={t.id} onClick={() => onSelect(t.id)} className={`p-4 rounded-xl border ${selectedId === t.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'} cursor-pointer`}> 
          <div className="flex justify-between">
            <div className="font-medium">{t.customer_name}</div>
            <div className="text-xs text-slate-500">{new Date(t.latest_at).toLocaleString()}</div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {t.flags.detractor && <Badge variant="destructive">Detractor</Badge>}
            {t.flags.urgent && <Badge>Urgent</Badge>}
            {t.flags.missed && <Badge variant="secondary">Missed-Review</Badge>}
            {t.rating ? <span className="text-xs text-slate-600 ml-auto">{t.rating}★</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}


