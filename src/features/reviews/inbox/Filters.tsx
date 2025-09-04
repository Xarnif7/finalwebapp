import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Filters = {
  quick: 'all' | 'urgent' | 'detractors' | 'unreplied' | 'completed';
  search: string;
  channel: 'all' | 'sms' | 'email';
  date: '7d' | '30d' | 'all';
};

type Props = {
  value: Filters;
  onChange: (next: Filters) => void;
};

export default function Filters({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <Select value={value.quick} onValueChange={(v: Filters['quick']) => onChange({ ...value, quick: v })}>
        <SelectTrigger className="rounded-xl"><SelectValue placeholder="All" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="detractors">Detractors</SelectItem>
          <SelectItem value="unreplied">Unreplied</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>
      <Input placeholder="Search name/email" value={value.search} onChange={(e) => onChange({ ...value, search: e.target.value })} className="rounded-xl" />
      <Select value={value.channel} onValueChange={(v: Filters['channel']) => onChange({ ...value, channel: v })}>
        <SelectTrigger className="rounded-xl"><SelectValue placeholder="All channels" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All channels</SelectItem>
          <SelectItem value="sms">SMS</SelectItem>
          <SelectItem value="email">Email</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.date} onValueChange={(v: Filters['date']) => onChange({ ...value, date: v })}>
        <SelectTrigger className="rounded-xl"><SelectValue placeholder="All time" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="all">All time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}


