import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function sendEmail({ to, subject, body, from }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: from || 'noreply@yourdomain.com', to: [to], subject, html: body.replace(/\n/g, '<br>'), text: body }),
  });
  if (!response.ok) throw new Error('Email failed');
}

async function sendSMS({ businessId, to, body }) {
  const response = await fetch(`${process.env.APP_BASE_URL || 'http://localhost:3001'}/api/surge/sms/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ businessId, to, body })
  });
  if (!response.ok) throw new Error('SMS failed');
}

export default async function handler(req, res) {
  try {
    const now = new Date();
    const min = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString();
    const max = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await supabase
      .from('review_requests')
      .select('id, business_id, channel, review_link, opened_at, clicked_at, completed_at, customers!inner(full_name, email, phone), businesses!inner(name, email)')
      .is('completed_at', null)
      .not('clicked_at', 'is', null)
      .gte('clicked_at', min)
      .lte('clicked_at', max)
      .limit(100);
    if (error) throw error;

    let sent = 0;
    for (const r of rows) {
      try {
        const customer = r.customers;
        const business = r.businesses;
        const messageEmail = `Hi ${customer.full_name},\n\nJust a quick reminder to complete your review for ${business.name}.\n\n${r.review_link}\n\nThanks so much!`;
        const messageSMS = `Quick reminder to review ${business.name}: ${r.review_link}`;
        if (r.channel === 'email' && customer.email) {
          await sendEmail({ to: customer.email, subject: 'Quick reminder', body: messageEmail, from: business.email });
        } else if (r.channel === 'sms' && customer.phone) {
          await sendSMS({ to: customer.phone, body: messageSMS });
        }
        await supabase.rpc('log_telemetry_event', { p_business_id: r.business_id, p_event_type: 'reminder_sent', p_event_data: { review_request_id: r.id, channel: r.channel } });
        sent++;
      } catch (e) {
        // continue
      }
    }

    return res.status(200).json({ success: true, reminders_sent: sent });
  } catch (e) {
    console.error('missed-review-recovery error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


