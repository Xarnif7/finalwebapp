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
    const { event_type, review_request_id, timestamp, metadata } = req.body;

    // Validate required fields
    if (!event_type || !review_request_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: event_type, review_request_id' 
      });
    }

    // Validate event type
    const validEvents = ['delivered', 'opened', 'clicked', 'completed'];
    if (!validEvents.includes(event_type)) {
      return res.status(400).json({ 
        error: `Invalid event_type. Must be one of: ${validEvents.join(', ')}` 
      });
    }

    const eventTimestamp = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    // Get review request to verify it exists and get business_id
    const { data: reviewRequest, error: requestError } = await supabase
      .from('review_requests')
      .select('id, business_id, status')
      .eq('id', review_request_id)
      .single();

    if (requestError || !reviewRequest) {
      return res.status(404).json({ error: 'Review request not found' });
    }

    // Update review request based on event type
    let updateData = {};
    let newStatus = reviewRequest.status;

    switch (event_type) {
      case 'delivered':
        updateData.delivered_at = eventTimestamp;
        break;
      case 'opened':
        updateData.opened_at = eventTimestamp;
        if (newStatus === 'sent') newStatus = 'opened';
        break;
      case 'clicked':
        updateData.clicked_at = eventTimestamp;
        if (newStatus === 'sent' || newStatus === 'opened') newStatus = 'clicked';
        break;
      case 'completed':
        updateData.completed_at = eventTimestamp;
        newStatus = 'completed';
        break;
    }

    updateData.status = newStatus;

    // Update the review request
    const { error: updateError } = await supabase
      .from('review_requests')
      .update(updateData)
      .eq('id', review_request_id);

    if (updateError) {
      console.error('Error updating review request:', updateError);
      return res.status(500).json({ error: 'Failed to update review request' });
    }

    // Log telemetry event
    await supabase.rpc('log_telemetry_event', {
      p_business_id: reviewRequest.business_id,
      p_event_type: `review_${event_type}`,
      p_event_data: {
        review_request_id: review_request_id,
        event_type: event_type,
        timestamp: eventTimestamp,
        metadata: metadata || {}
      }
    });

    // Special handling for completed reviews
    if (event_type === 'completed') {
      // Check if this is a 5-star review for social media pipeline
      if (metadata?.rating === 5) {
        // Create social post draft
        const { error: socialError } = await supabase
          .from('social_posts')
          .insert({
            business_id: reviewRequest.business_id,
            review_id: metadata.review_id || null,
            platform: 'facebook', // Default platform
            content: {
              rating: 5,
              customer_name: metadata.customer_name || 'Customer',
              review_text: metadata.review_text || '',
              auto_generated: true
            },
            status: 'draft'
          });

        if (socialError) {
          console.error('Error creating social post:', socialError);
        }
      }
    }

    // Special handling for missed reviews (clicked but not completed after 24h)
    if (event_type === 'clicked') {
      // Schedule a reminder job for 24-36 hours later
      const reminderTime = new Date();
      reminderTime.setHours(reminderTime.getHours() + 30); // 30 hours later

      const { error: jobError } = await supabase
        .from('scheduled_jobs')
        .insert({
          job_type: 'missed_review_reminder',
          payload: {
            review_request_id: review_request_id,
            business_id: reviewRequest.business_id
          },
          run_at: reminderTime.toISOString(),
          status: 'queued'
        });

      if (jobError) {
        console.error('Error scheduling reminder job:', jobError);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Event ${event_type} recorded successfully`,
      review_request_id: review_request_id,
      new_status: newStatus
    });

  } catch (error) {
    console.error('Error in events endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
