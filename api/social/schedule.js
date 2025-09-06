import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { social_post_id, schedule_at, mark_sent } = req.body;
    if (!social_post_id) {
      return res.status(400).json({ error: 'Missing social_post_id' });
    }

    // Load post and business
    const { data: post, error } = await supabase
      .from('social_posts')
      .select('id, business_id, status')
      .eq('id', social_post_id)
      .single();
    if (error || !post) return res.status(404).json({ error: 'Post not found' });

    if (mark_sent) {
      await supabase
        .from('social_posts')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', social_post_id);
    } else if (schedule_at) {
      await supabase
        .from('scheduled_jobs')
        .insert({
          business_id: post.business_id,
          job_type: 'send_social_post',
          payload: { social_post_id },
          scheduled_for: schedule_at,
        });
      await supabase
        .from('social_posts')
        .update({ status: 'scheduled' })
        .eq('id', social_post_id);
    }

    await supabase.rpc('log_telemetry_event', {
      p_business_id: post.business_id,
      p_event_type: mark_sent ? 'social_post_sent' : 'social_post_scheduled',
      p_event_data: { social_post_id, schedule_at: schedule_at || null },
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Error in social schedule endpoint:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


