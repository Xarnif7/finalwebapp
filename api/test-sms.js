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
    console.log('🚀 TEST-SMS API called with:', req.body);
    
    const { businessId, to, message } = req.body;

    if (!businessId || !to || !message) {
      return res.status(400).json({ error: 'Missing required fields: businessId, to, message' });
    }

    console.log('🚀 TEST-SMS: This is SMS-only endpoint, processing phone number:', to);

    // Get business data
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      console.error('❌ Business not found:', businessError);
      return res.status(404).json({ error: 'Business not found' });
    }

    console.log('🚀 TEST-SMS: Business found:', {
      id: business.id,
      name: business.name,
      from_number: business.from_number,
      sms_enabled: business.sms_enabled,
      verification_status: business.verification_status
    });

    // Check if SMS is enabled
    if (!business.sms_enabled) {
      return res.status(400).json({ error: 'SMS not enabled for this business' });
    }

    if (!business.from_number) {
      return res.status(400).json({ error: 'No SMS number configured for this business' });
    }

    if (business.verification_status !== 'active') {
      return res.status(400).json({ 
        error: 'SMS not verified', 
        status: business.verification_status 
      });
    }

    // Normalize phone number
    const normalizedPhone = to.replace(/\D/g, '');
    const e164Phone = normalizedPhone.startsWith('1') ? `+${normalizedPhone}` : `+1${normalizedPhone}`;

    console.log('🚀 TEST-SMS: Normalized phone:', { original: to, normalized: normalizedPhone, e164: e164Phone });

    // Send SMS via Surge API
    const baseUrl = process.env.APP_BASE_URL || 'https://myblipp.com';
    console.log('🚀 TEST-SMS: Using base URL:', baseUrl);
    
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
      console.error('❌ SMS send failed:', smsData);
      throw new Error(`SMS send failed: ${smsData.error || 'Unknown error'}`);
    }

    console.log(`✅ TEST-SMS: SMS sent successfully: ${smsData.message_id}`);

    return res.status(200).json({
      success: true,
      message: 'Test SMS sent successfully!',
      channel: 'sms',
      recipient: e164Phone,
      messageId: smsData.message_id
    });

  } catch (error) {
    console.error('❌ TEST-SMS: Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send SMS' });
  }
}
