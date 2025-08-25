import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reviewId, replyText, channel = 'manual', responderId } = req.body;

    if (!reviewId || !replyText) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['manual', 'email', 'sms', 'both'].includes(channel)) {
      return res.status(400).json({ error: 'Invalid channel' });
    }

    // Get the review to verify it exists and get business_id
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, business_id')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Insert reply record
    const { data: reply, error: insertError } = await supabase
      .from('review_replies')
      .insert({
        review_id: reviewId,
        reply_text: replyText,
        channel,
        responder_id: responderId || 'system',
        business_id: review.business_id
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: 'Failed to create reply' });
    }

    // Update review responded status
    const { error: updateError } = await supabase
      .from('reviews')
      .update({ 
        responded: true,
        reply_text: replyText,
        reply_posted_at: new Date().toISOString()
      })
      .eq('id', reviewId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update review status' });
    }

    return res.status(200).json({ 
      ok: true, 
      reply: reply
    });

  } catch (error) {
    console.error('Review reply error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
