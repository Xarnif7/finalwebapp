import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const nowIso = new Date().toISOString();
    const { data: due, error } = await supabase
      .from('review_requests')
      .select('id, business_id, channel, customers!inner(full_name, email, phone), businesses!inner(name, email), review_link')
      .lte('best_send_at', nowIso)
      .eq('status', 'scheduled')
      .limit(50);
    if (error) throw error;

    for (const r of due) {
      // Enqueue to existing send-now path by creating a scheduled_jobs entry or directly call send
      await supabase.from('scheduled_jobs').insert({
        business_id: r.business_id,
        job_type: 'send_review_request_now',
        payload: { review_request_id: r.id },
        scheduled_for: nowIso,
      });
      await supabase.from('review_requests').update({ status: 'sent', sent_at: nowIso }).eq('id', r.id);
      await supabase.rpc('log_telemetry_event', { p_business_id: r.business_id, p_event_type: 'request_sent', p_event_data: { review_request_id: r.id, channel: r.channel } });
    }

    return res.status(200).json({ success: true, processed: due.length });
  } catch (e) {
    console.error('magic-send-dispatcher error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


