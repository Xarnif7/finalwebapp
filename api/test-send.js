/**
 * Test Send API Endpoint
 * POST /api/test-send
 * Sends test messages via email and/or SMS
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, phone, message, template_name, service_type, business_id, channels = ['email'] } = req.body;

    // Validate required fields
    if (!message || !business_id) {
      return res.status(400).json({ error: 'Missing required fields: message, business_id' });
    }

    // Validate channels
    if (!Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ error: 'At least one channel must be specified' });
    }

    const results = [];

    // Send email if requested
    if (channels.includes('email') && email) {
      try {
        const emailResult = await sendTestEmail(email, message, template_name, service_type, business_id);
        results.push({ channel: 'email', success: emailResult.success, error: emailResult.error });
      } catch (error) {
        results.push({ channel: 'email', success: false, error: error.message });
      }
    }

    // Send SMS if requested
    if (channels.includes('sms') && phone) {
      try {
        const smsResult = await sendTestSMS(phone, message, business_id);
        results.push({ channel: 'sms', success: smsResult.success, error: smsResult.error });
      } catch (error) {
        results.push({ channel: 'sms', success: false, error: error.message });
      }
    }

    // Check if any messages were sent successfully
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    if (successCount === 0) {
      return res.status(400).json({ 
        error: 'Failed to send test messages',
        results: results
      });
    }

    res.status(200).json({
      success: true,
      message: `Test messages sent successfully (${successCount}/${totalCount})`,
      results: results
    });

  } catch (error) {
    console.error('[TEST_SEND] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function sendTestEmail(email, message, template_name, service_type, business_id) {
  try {
    // Get business info
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('name, email')
      .eq('id', business_id)
      .single();

    if (businessError || !business) {
      return { success: false, error: 'Business not found' };
    }

    // Create test email content
    const subject = `Test: ${template_name || 'Automation Template'}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🧪 Test Message</h2>
        <p><strong>Template:</strong> ${template_name || 'N/A'}</p>
        <p><strong>Service Type:</strong> ${service_type || 'N/A'}</p>
        <p><strong>Business:</strong> ${business.name}</p>
        <hr>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Your Custom Message:</h3>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        <p style="color: #666; font-size: 12px;">
          This is a test message from your Blipp automation system.
        </p>
      </div>
    `;

    // Send via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Blipp <noreply@myblipp.com>',
        to: [email],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Email send failed: ${error}` };
    }

    const result = await response.json();
    console.log(`[TEST_EMAIL] Sent successfully to ${email}: ${result.id}`);
    return { success: true, messageId: result.id };

  } catch (error) {
    console.error('[TEST_EMAIL] Error:', error);
    return { success: false, error: error.message };
  }
}

async function sendTestSMS(phone, message, business_id) {
  try {
    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, '');
    const e164Phone = normalizedPhone.startsWith('1') ? `+${normalizedPhone}` : `+1${normalizedPhone}`;

    // Send via Surge API
    const response = await fetch(`${process.env.APP_BASE_URL || 'http://localhost:3001'}/api/surge/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        businessId: business_id,
        to: e164Phone,
        body: `🧪 TEST: ${message}`
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'SMS send failed' };
    }

    console.log(`[TEST_SMS] Sent successfully to ${e164Phone}: ${result.message_id}`);
    return { success: true, messageId: result.message_id };

  } catch (error) {
    console.error('[TEST_SMS] Error:', error);
    return { success: false, error: error.message };
  }
}