import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
  counts: { sent: number; opened: number; clicked: number; completed: number };
  children?: React.ReactNode;
};

export default function InboxHeader({ counts, children }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Sent', value: counts.sent },
          { label: 'Opened', value: counts.opened },
          { label: 'Clicked', value: counts.clicked },
          { label: 'Completed', value: counts.completed },
        ].map(({ label, value }) => (
          <Card key={label} className="rounded-xl">
            <CardContent className="p-4">
              <div className="text-sm text-slate-600">{label}</div>
              <div className="text-2xl font-semibold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {children}
    </div>
  );
}


