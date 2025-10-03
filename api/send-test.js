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
    console.log('🚀 Request headers:', req.headers);
    
    const { businessId, to, message } = req.body;

    console.log('🚀 Parsed fields:', { businessId, to, message, messageLength: message?.length });

    if (!businessId || !to || !message) {
      console.log('🚀 Missing required fields:', { businessId: !!businessId, to: !!to, message: !!message });
      return res.status(400).json({ error: 'Missing required fields: businessId, to, message' });
    }

    // Determine if it's email or SMS - be more explicit
    const containsAt = to.includes('@');
    const containsDot = to.includes('.');
    const isPhoneNumber = /^[\+]?[\d\s\-\(\)]+$/.test(to);
    const isEmail = containsAt && containsDot && !isPhoneNumber;
    const channel = isEmail ? 'email' : 'sms';

    console.log(`🚀 Sending test ${channel} to:`, to);
    console.log(`🚀 Channel detection:`, { 
      to, 
      containsAt, 
      containsDot, 
      isPhoneNumber,
      isEmail, 
      channel,
      type: typeof to,
      length: to.length
    });

    // Force SMS for phone numbers - MORE AGGRESSIVE CHECK
    console.log('🚀 Checking if phone number...', { 
      to, 
      isPhoneNumber, 
      regexTest: /^[\+]?[\d\s\-\(\)]+$/.test(to),
      length: to.length,
      isNumeric: /^\d+$/.test(to.replace(/\D/g, ''))
    });

    if (isPhoneNumber || /^\d+$/.test(to.replace(/\D/g, '')) || to.length >= 10) {
      console.log('🚀 FORCING SMS path for phone number');
      const normalizedPhone = to.replace(/\D/g, '');
      const e164Phone = normalizedPhone.startsWith('1') ? `+${normalizedPhone}` : `+1${normalizedPhone}`;

      console.log('🚀 Normalized phone:', { original: to, normalized: normalizedPhone, e164: e164Phone });

      // Get business data for SMS validation
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (businessError || !business) {
        throw new Error('Business not found');
      }

      console.log('🚀 Business SMS config:', {
        sms_enabled: business.sms_enabled,
        from_number: business.from_number,
        verification_status: business.verification_status
      });

      if (!business.sms_enabled) {
        throw new Error('SMS not enabled for this business');
      }

      if (!business.from_number) {
        throw new Error('No SMS number configured for this business');
      }

      if (business.verification_status !== 'active') {
        throw new Error(`SMS not verified: ${business.verification_status}`);
      }

      const baseUrl = process.env.APP_BASE_URL || 'https://myblipp.com';
      console.log('🚀 Using base URL for SMS:', baseUrl);
      
      const smsResponse = await fetch(`${baseUrl}/api/surge/sms/send`, {
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


    if (isEmail) {
      console.log('🚀 Going to EMAIL path');
      // Send test email via Resend
      console.log('🚀 Sending email via Resend...');
      console.log('🚀 RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
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
      console.log('🚀 Going to SMS path');
      // Send test SMS via Surge API
      console.log('🚀 Sending SMS via Surge...');
      console.log('🚀 SUPABASE_SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      console.log('🚀 APP_BASE_URL:', process.env.APP_BASE_URL);
      
      const normalizedPhone = to.replace(/\D/g, '');
      const e164Phone = normalizedPhone.startsWith('1') ? `+${normalizedPhone}` : `+1${normalizedPhone}`;

      console.log('🚀 Normalized phone:', { original: to, normalized: normalizedPhone, e164: e164Phone });

      const baseUrl = process.env.APP_BASE_URL || 'https://myblipp.com';
      console.log('🚀 Using base URL for SMS:', baseUrl);
      
      const smsResponse = await fetch(`${baseUrl}/api/surge/sms/send`, {
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
