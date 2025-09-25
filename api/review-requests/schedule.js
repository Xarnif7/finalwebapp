import { createClient } from '@supabase/supabase-js';
import { computeBestSendAt } from '../../src/lib/schedule/heuristics';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId, items, dryRun } = req.body;
    if (!businessId || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const previews = items.map((it) => {
      let best = null;
      if (it.strategy === 'magic') {
        best = computeBestSendAt({ jobEndAt: it.job_end_at || undefined });
      }
      return { customerId: it.customerId, strategy: it.strategy, best_send_at: best?.toISOString() || null };
    });

    if (dryRun) {
      return res.status(200).json({ previews });
    }

    // Insert review_requests and scheduled_jobs
    const toInsert = [];
    for (const it of items) {
      const best = it.strategy === 'magic' ? computeBestSendAt({ jobEndAt: it.job_end_at || undefined }).toISOString() : new Date().toISOString();
      toInsert.push({
        business_id: businessId,
        customer_id: it.customerId,
        channel: it.channel,
        status: it.strategy === 'magic' ? 'scheduled' : 'sent',
        best_send_at: it.strategy === 'magic' ? best : null,
      });
    }
    const { data: inserted, error } = await supabase.from('review_requests').insert(toInsert).select('id, business_id, status, best_send_at');
    if (error) return res.status(500).json({ error: 'Failed to insert review requests' });

    const jobs = inserted
      .filter((r) => r.status === 'scheduled' && r.best_send_at)
      .map((r) => ({ business_id: r.business_id, job_type: 'send_review_request', payload: { review_request_id: r.id }, scheduled_for: r.best_send_at }));
    if (jobs.length > 0) {
      await supabase.from('scheduled_jobs').insert(jobs);
    }

    await supabase.rpc('log_telemetry_event', {
      p_business_id: businessId,
      p_event_type: 'bulk_requests_scheduled',
      p_event_data: { count: inserted.length },
    });

    return res.status(200).json({ success: true, created: inserted.map((r) => r.id), previews });
  } catch (e) {
    console.error('schedule error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Magic Send Time Logic
function calculateMagicSendTime(jobEndAt = null, timezone = 'America/New_York') {
  const now = new Date();
  const businessTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  // Default optimal times: Tuesday-Thursday, 10am-1pm local time
  const optimalDays = [2, 3, 4]; // Tuesday, Wednesday, Thursday
  const optimalStartHour = 10;
  const optimalEndHour = 13;
  
  let sendTime = new Date(businessTime);
  
  // If job_end_at is provided, bias towards 2-3 hours after completion
  if (jobEndAt) {
    const jobEnd = new Date(jobEndAt);
    sendTime = new Date(jobEnd.getTime() + (2.5 * 60 * 60 * 1000)); // 2.5 hours later
    
    // Ensure it's within business hours (9am-5pm)
    if (sendTime.getHours() < 9) {
      sendTime.setHours(9, 0, 0, 0);
    } else if (sendTime.getHours() >= 17) {
      sendTime.setDate(sendTime.getDate() + 1);
      sendTime.setHours(9, 0, 0, 0);
    }
  } else {
    // Default to next optimal time slot
    sendTime.setHours(optimalStartHour, 0, 0, 0);
    
    // Find next optimal day
    while (!optimalDays.includes(sendTime.getDay())) {
      sendTime.setDate(sendTime.getDate() + 1);
    }
  }
  
  // Avoid weekends
  while (sendTime.getDay() === 0 || sendTime.getDay() === 6) {
    sendTime.setDate(sendTime.getDate() + 1);
  }
  
  // Avoid early morning (6-8am) and late evening (10pm+)
  if (sendTime.getHours() >= 6 && sendTime.getHours() < 8) {
    sendTime.setHours(8, 0, 0, 0);
  } else if (sendTime.getHours() >= 22) {
    sendTime.setDate(sendTime.getDate() + 1);
    sendTime.setHours(9, 0, 0, 0);
  }
  
  return sendTime.toISOString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customer_id, channel, strategy, job_end_at, job_type, tech_id } = req.body;

    // Validate required fields
    if (!customer_id || !channel || !strategy) {
      return res.status(400).json({ 
        error: 'Missing required fields: customer_id, channel, strategy' 
      });
    }

    // Validate channel
    if (!['sms', 'email'].includes(channel)) {
      return res.status(400).json({ 
        error: 'Invalid channel. Must be "sms" or "email"' 
      });
    }

    // Validate strategy
    if (!['immediate', 'magic'].includes(strategy)) {
      return res.status(400).json({ 
        error: 'Invalid strategy. Must be "immediate" or "magic"' 
      });
    }

    // Get user from JWT token
    const authHeader = headers().get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user's business_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.business_id) {
      return res.status(400).json({ error: 'User not associated with a business' });
    }

    // Verify customer belongs to business
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name, email, phone')
      .eq('id', customer_id)
      .eq('business_id', profile.business_id)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Validate contact info for channel
    if (channel === 'email' && !customer.email) {
      return res.status(400).json({ 
        error: 'Customer does not have an email address' 
      });
    }
    if (channel === 'sms' && !customer.phone) {
      return res.status(400).json({ 
        error: 'Customer does not have a phone number' 
      });
    }

    let best_send_at = null;
    let status = 'pending';

    // Calculate send time based on strategy
    if (strategy === 'magic') {
      best_send_at = calculateMagicSendTime(job_end_at);
      status = 'scheduled';
    } else {
      // Immediate strategy - send now
      best_send_at = new Date().toISOString();
      status = 'pending';
    }

    // Create review request first to get the ID
    const { data: reviewRequest, error: insertError } = await supabase
      .from('review_requests')
      .insert({
        business_id: profile.business_id,
        customer_id: customer_id,
        channel: channel,
        strategy: strategy,
        best_send_at: best_send_at,
        status: status,
        tech_id: tech_id || null,
        job_type: job_type || null,
        job_end_at: job_end_at || null,
        review_link: 'pending' // Will be updated after creation
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating review request:', insertError);
      return res.status(500).json({ error: 'Failed to create review request' });
    }

    // Generate review link using the actual review request ID
    const reviewLink = `${process.env.APP_BASE_URL}/feedback/${reviewRequest.id}`;

    // Update the review request with the correct link
    const { error: updateError } = await supabase
      .from('review_requests')
      .update({ review_link: reviewLink })
      .eq('id', reviewRequest.id);

    if (updateError) {
      console.error('Error updating review link:', updateError);
      // Don't fail the entire operation, just log the error
    }

    // Log telemetry event
    await supabase.rpc('log_telemetry_event', {
      p_business_id: profile.business_id,
      p_event_type: 'request_scheduled',
      p_event_data: {
        review_request_id: reviewRequest.id,
        strategy: strategy,
        channel: channel,
        best_send_at: best_send_at
      }
    });

    // If immediate strategy, queue for immediate sending
    if (strategy === 'immediate') {
      const { error: jobError } = await supabase
        .from('scheduled_jobs')
        .insert({
          job_type: 'send_review_request',
          payload: {
            review_request_id: reviewRequest.id,
            business_id: profile.business_id
          },
          run_at: new Date().toISOString(),
          status: 'queued'
        });

      if (jobError) {
        console.error('Error queuing immediate job:', jobError);
        // Don't fail the request, just log the error
      }
    }

    return res.status(200).json({
      success: true,
      review_request: reviewRequest,
      send_time: best_send_at,
      strategy: strategy
    });

  } catch (error) {
    console.error('Error in schedule endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
