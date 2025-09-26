import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Email sending via Resend
async function sendEmail({ to, subject, body, from }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from || 'noreply@yourdomain.com',
      to: [to],
      subject: subject,
      html: body.replace(/\n/g, '<br>'),
      text: body,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return {
    ok: true,
    messageId: data.id,
    message: 'Email sent successfully via Resend',
    data: data
  };
}

// SMS sending via Twilio
async function sendSMS({ to, body, from }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: fromNumber,
      To: to,
      Body: body,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return {
    ok: true,
    messageId: data.sid,
    message: 'SMS sent successfully via Twilio',
    data: data
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { review_request_id } = req.body;

    if (!review_request_id) {
      return res.status(400).json({ error: 'Missing review_request_id' });
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
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.business_id) {
      return res.status(400).json({ error: 'User not associated with a business' });
    }

    // Get review request with customer and business info
    const { data: reviewRequest, error: requestError } = await supabase
      .from('review_requests')
      .select(`
        *,
        customers!inner(first_name, last_name, email, phone),
        businesses!inner(name, email)
      `)
      .eq('id', review_request_id)
      .eq('business_id', profile.business_id)
      .single();

    if (requestError || !reviewRequest) {
      return res.status(404).json({ error: 'Review request not found' });
    }

    // Check if already sent
    if (reviewRequest.status === 'sent' || reviewRequest.sent_at) {
      return res.status(400).json({ error: 'Review request already sent' });
    }

    const customer = reviewRequest.customers;
    const business = reviewRequest.businesses;

    // Fix review link if it's in the old format
    let reviewLink = reviewRequest.review_link;
    if (!reviewLink || reviewLink.includes('/r/') || reviewLink === 'pending') {
      // Generate the correct feedback collection link
      reviewLink = `${process.env.APP_BASE_URL || 'https://myblipp.com'}/feedback/${reviewRequest.id}`;
      
      // Update the review request with the correct link
      await supabase
        .from('review_requests')
        .update({ review_link: reviewLink })
        .eq('id', reviewRequest.id);
    }

    // Prepare message based on channel
    let message, subject;
    
    // Construct customer name from first_name and last_name
    const customerName = customer.first_name && customer.last_name 
      ? `${customer.first_name} ${customer.last_name}`
      : customer.first_name || customer.last_name || 'Valued Customer';

    if (reviewRequest.channel === 'email') {
      subject = `How was your experience with ${business.name}?`;
      message = `Hi ${customerName},

Thank you for choosing ${business.name}! We'd love to hear about your experience.

Please take a moment to share your feedback:
${reviewLink}

Your feedback helps us improve and serve our customers better.

Best regards,
${business.name}`;
    } else {
      // SMS
      message = `Hi ${customerName}! Thanks for choosing ${business.name}. How was your experience? Share feedback: ${reviewLink}`;
    }

    let sendResult;
    const sentAt = new Date().toISOString();

    // Send via appropriate channel
    try {
      if (reviewRequest.channel === 'email') {
        sendResult = await sendEmail({
          to: customer.email,
          subject: subject,
          body: message,
          from: business.email || 'noreply@yourdomain.com'
        });
      } else {
        sendResult = await sendSMS({
          to: customer.phone,
          body: message
        });
      }

      // Update review request status
      const { error: updateError } = await supabase
        .from('review_requests')
        .update({
          status: 'sent',
          sent_at: sentAt,
          delivered_at: sentAt // Assume delivered immediately for now
        })
        .eq('id', review_request_id);

      if (updateError) {
        console.error('Error updating review request:', updateError);
      }

      // Log telemetry event
      await supabase.rpc('log_telemetry_event', {
        p_business_id: profile.business_id,
        p_event_type: 'request_sent',
        p_event_data: {
          review_request_id: review_request_id,
          channel: reviewRequest.channel,
          message_id: sendResult.messageId
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Review request sent successfully',
        message_id: sendResult.messageId,
        sent_at: sentAt
      });

    } catch (sendError) {
      console.error('Error sending message:', sendError);
      
      // Update status to failed
      await supabase
        .from('review_requests')
        .update({
          status: 'failed'
        })
        .eq('id', review_request_id);

      return res.status(500).json({
        error: 'Failed to send review request',
        details: sendError.message
      });
    }

  } catch (error) {
    console.error('Error in send-now endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
