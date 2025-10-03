import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Test send API called with:', req.body);
    
    const { businessId, to, message } = req.body;

    if (!businessId || !to || !message) {
      return res.status(400).json({ error: 'Missing required fields: businessId, to, message' });
    }

    // Determine if it's email or SMS
    const isEmail = to.includes('@');
    const channel = isEmail ? 'email' : 'sms';

    console.log(`🚀 Sending test ${channel} to:`, to);

    if (isEmail) {
      // Send test email via Resend
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Blipp <noreply@myblipp.com>',
          to: [to],
          subject: '🧪 Test Message from Blipp',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">🧪 Test Message</h2>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3>Your Custom Message:</h3>
                <p style="white-space: pre-wrap;">${message}</p>
              </div>
              <p style="color: #666; font-size: 12px;">
                This is a test message from your Blipp automation system.
              </p>
            </div>
          `,
          text: `🧪 Test Message\n\nYour Custom Message:\n\n${message}\n\nThis is a test message from your Blipp automation system.`
        })
      });

      if (!emailResponse.ok) {
        const error = await emailResponse.text();
        throw new Error(`Email send failed: ${error}`);
      }

      const emailData = await emailResponse.json();
      console.log(`✅ Test email sent successfully: ${emailData.id}`);

      return res.status(200).json({
        success: true,
        message: 'Test email sent successfully!',
        channel: 'email',
        recipient: to,
        messageId: emailData.id
      });

    } else {
      // Send test SMS via Surge API
      const normalizedPhone = to.replace(/\D/g, '');
      const e164Phone = normalizedPhone.startsWith('1') ? `+${normalizedPhone}` : `+1${normalizedPhone}`;

      const smsResponse = await fetch(`${process.env.APP_BASE_URL || 'http://localhost:3001'}/api/surge/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          businessId: businessId,
          to: e164Phone,
          body: `🧪 TEST: ${message}`
        })
      });

      const smsData = await smsResponse.json();

      if (!smsResponse.ok) {
        throw new Error(`SMS send failed: ${smsData.error || 'Unknown error'}`);
      }

      console.log(`✅ Test SMS sent successfully: ${smsData.message_id}`);

      return res.status(200).json({
        success: true,
        message: 'Test SMS sent successfully!',
        channel: 'sms',
        recipient: e164Phone,
        messageId: smsData.message_id
      });
    }

  } catch (error) {
    console.error('Error in test send:', error);
    return res.status(500).json({ error: error.message || 'Failed to send message' });
  }
}
