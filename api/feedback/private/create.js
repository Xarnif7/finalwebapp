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
    const { review_request_id, sentiment, category, message } = req.body;

    // Validate required fields
    if (!review_request_id || !sentiment || !category || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: review_request_id, sentiment, category, message' 
      });
    }

    // Validate sentiment
    const validSentiments = ['positive', 'neutral', 'negative'];
    if (!validSentiments.includes(sentiment)) {
      return res.status(400).json({ 
        error: `Invalid sentiment. Must be one of: ${validSentiments.join(', ')}` 
      });
    }

    // Validate category
    const validCategories = [
      'service_quality',
      'communication',
      'pricing',
      'timeliness',
      'cleanliness',
      'staff_behavior',
      'equipment',
      'follow_up',
      'other'
    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
      });
    }

    // Get review request to verify it exists and get business_id
    const { data: reviewRequest, error: requestError } = await supabase
      .from('review_requests')
      .select('id, business_id, customer_id')
      .eq('id', review_request_id)
      .single();

    if (requestError || !reviewRequest) {
      return res.status(404).json({ error: 'Review request not found' });
    }

    // Create private feedback record
    const { data: feedback, error: insertError } = await supabase
      .from('private_feedback')
      .insert({
        review_request_id: review_request_id,
        sentiment: sentiment,
        category: category,
        message: message
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating private feedback:', insertError);
      return res.status(500).json({ error: 'Failed to create private feedback' });
    }

    // Log telemetry event
    await supabase.rpc('log_telemetry_event', {
      p_business_id: reviewRequest.business_id,
      p_event_type: 'feedback_created',
      p_event_data: {
        feedback_id: feedback.id,
        review_request_id: review_request_id,
        sentiment: sentiment,
        category: category
      }
    });

    // Generate ticket ID (simple format: FB-{timestamp})
    const ticketId = `FB-${Date.now().toString().slice(-6)}`;

    return res.status(200).json({
      success: true,
      message: 'Private feedback created successfully',
      feedback_id: feedback.id,
      ticket_id: ticketId,
      sentiment: sentiment,
      category: category
    });

  } catch (error) {
    console.error('Error in private feedback create endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
