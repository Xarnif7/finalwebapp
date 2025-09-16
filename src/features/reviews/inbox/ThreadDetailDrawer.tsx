import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { generateReplyDrafts } from '@/lib/ai/replyCoach';
import { logEvent } from '@/lib/telemetry';
import { supabase } from '@/lib/supabase/browser';

type Props = {
  open: boolean;
  onClose: () => void;
  threadId?: string;
};

export default function ThreadDetailDrawer({ open, onClose, threadId }: Props) {
  if (!open) return null;
  const [tone, setTone] = React.useState<'professional' | 'friendly' | 'grateful' | 'brief'>('professional');
  const [drafts, setDrafts] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  async function handleGenerate() {
    try {
      setLoading(true);
      if (!threadId) return;
      // Minimal mapping: assume threadId maps to review id
      const { data: profile } = await supabase.from('profiles').select('business_id').single();
      const res = await generateReplyDrafts({ reviewId: String(threadId), tone });
      setDrafts([res.suggestions.option1, res.suggestions.option2]);
      if (profile?.business_id) {
        await logEvent(profile.business_id, 'reply_draft_generated', { tone });
      }
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[520px] bg-white shadow-xl z-40">
      <div className="p-4 flex items-center justify-between border-b">
        <div className="font-semibold">Thread Details</div>
        <Button variant="outline" onClick={onClose} className="rounded-xl">Close</Button>
      </div>
      <div className="p-4 space-y-4">
        <Card className="rounded-xl"><CardHeader><CardTitle>Timeline</CardTitle></CardHeader><CardContent>…</CardContent></Card>
        {isFeatureEnabled('rescueLane') && (
          <Card className="rounded-xl">
            <CardHeader><CardTitle>Rescue Lane</CardTitle></CardHeader>
            <CardContent>
              <RescueLaneForm threadId={threadId} />
            </CardContent>
          </Card>
        )}
        {isFeatureEnabled('replyCoach') && (
          <Card className="rounded-xl">
            <CardHeader><CardTitle>AI Reply Coach</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <Select value={tone} onValueChange={(v: any) => setTone(v)}>
                  <SelectTrigger className="w-48 rounded-xl">
                    <SelectValue placeholder="Tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="grateful">Grateful</SelectItem>
                    <SelectItem value="brief">Brief</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleGenerate} disabled={loading} className="rounded-xl">
                  {loading ? 'Generating…' : 'Generate drafts'}
                </Button>
              </div>
              {drafts.length > 0 && (
                <div className="space-y-3">
                  {drafts.map((d, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-50 text-sm leading-relaxed">{d}</div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {isFeatureEnabled('socialPipeline') && (
          <Card className="rounded-xl">
            <CardHeader><CardTitle>Social</CardTitle></CardHeader>
            <CardContent>
              <SocialPanel threadId={threadId} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function RescueLaneForm({ threadId }: { threadId?: string }) {
  const [sentiment, setSentiment] = React.useState<'negative' | 'neutral' | 'positive'>('negative');
  const [category, setCategory] = React.useState('service_quality');
  const [message, setMessage] = React.useState('');
  const [preferred, setPreferred] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState<string | null>(null);

  async function submit() {
    try {
      setSubmitting(true);
      setSuccess(null);
      if (!threadId) return;
      const res = await fetch('/api/feedback/private/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_request_id: threadId,
          sentiment,
          category,
          message,
          preferred_callback_time: preferred || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSuccess(`Ticket ${data.ticket_id} created`);
      // fire telemetry via SQL RPC handled server-side
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Select value={sentiment} onValueChange={(v: any) => setSentiment(v)}>
          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sentiment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="negative">Negative</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory as any}>
          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="service_quality">Service quality</SelectItem>
            <SelectItem value="communication">Communication</SelectItem>
            <SelectItem value="pricing">Pricing</SelectItem>
            <SelectItem value="timeliness">Timeliness</SelectItem>
            <SelectItem value="cleanliness">Cleanliness</SelectItem>
            <SelectItem value="staff_behavior">Staff behavior</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="follow_up">Follow up</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Textarea
        placeholder="Describe the issue (customer's private feedback)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        className="rounded-xl"
      />
      <Input
        type="datetime-local"
        value={preferred}
        onChange={(e) => setPreferred(e.target.value)}
        className="rounded-xl"
      />
      <div className="flex items-center gap-2">
        <Button onClick={submit} disabled={submitting || !message} className="rounded-xl">
          {submitting ? 'Submitting…' : 'Create ticket'}
        </Button>
        {success && <div className="text-xs text-emerald-700">{success}</div>}
      </div>
    </div>
  );
}

function SocialPanel({ threadId }: { threadId?: string }) {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{ caption: string; image_url: string; social_post: any } | null>(null);
  const [scheduleAt, setScheduleAt] = React.useState('');

  async function prepare() {
    try {
      setLoading(true);
      if (!threadId) return;
      const res = await fetch('/api/social/prepare-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: threadId }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setResult({ caption: data.caption, image_url: data.image_url, social_post: data.social_post });
    } finally {
      setLoading(false);
    }
  }

  async function schedule() {
    if (!result) return;
    await fetch('/api/social/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ social_post_id: result.social_post.id, schedule_at: scheduleAt }),
    });
  }

  async function markSent() {
    if (!result) return;
    await fetch('/api/social/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ social_post_id: result.social_post.id, mark_sent: true }),
    });
  }

  return (
    <div className="space-y-3">
      {!result ? (
        <Button onClick={prepare} disabled={loading} className="rounded-xl">{loading ? 'Preparing…' : 'Create social post'}</Button>
      ) : (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-slate-50 text-sm">{result.caption}</div>
          <img src={result.image_url} alt="social" className="rounded-lg border" />
          <div className="flex items-center gap-2">
            <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="rounded-xl" />
            <Button onClick={schedule} disabled={!scheduleAt} className="rounded-xl">Schedule</Button>
            <Button variant="outline" onClick={markSent} className="rounded-xl">Mark Sent</Button>
          </div>
        </div>
      )}
    </div>
  );
}


