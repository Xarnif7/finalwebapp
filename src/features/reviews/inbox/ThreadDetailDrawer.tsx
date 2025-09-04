import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onClose: () => void;
  threadId?: string;
};

export default function ThreadDetailDrawer({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[520px] bg-white shadow-xl z-40">
      <div className="p-4 flex items-center justify-between border-b">
        <div className="font-semibold">Thread Details</div>
        <Button variant="outline" onClick={onClose} className="rounded-xl">Close</Button>
      </div>
      <div className="p-4 space-y-4">
        <Card className="rounded-xl"><CardHeader><CardTitle>Timeline</CardTitle></CardHeader><CardContent>…</CardContent></Card>
        <Card className="rounded-xl"><CardHeader><CardTitle>Rescue Lane</CardTitle></CardHeader><CardContent>…</CardContent></Card>
        <Card className="rounded-xl"><CardHeader><CardTitle>AI Reply Coach</CardTitle></CardHeader><CardContent>…</CardContent></Card>
        <Card className="rounded-xl"><CardHeader><CardTitle>Social</CardTitle></CardHeader><CardContent>…</CardContent></Card>
      </div>
    </div>
  );
}


