import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, body } = req.body;
    
    if (!to || !body) {
      return res.status(400).json({ error: 'Missing to or body' });
    }

    // Use hardcoded business configuration
    const fromNumber = '+18775402797';
    const surgeAccountId = 'surge_account_674fedc5-7937-4054-bffd-e4ecc22abc1d';

    // Normalize phone number
    const normalizedTo = to.replace(/\D/g, '');
    const e164Phone = normalizedTo.startsWith('1') ? `+${normalizedTo}` : `+1${normalizedTo}`;
    
    console.log(`[SMS_SEND] Sending SMS from ${fromNumber} to ${e164Phone}`);

    // Send via Surge API
    const surgeResponse = await fetch(`${process.env.SURGE_API_BASE}/v1/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SURGE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        account_id: surgeAccountId,
        from: fromNumber,
        to: e164Phone,
        body: body + '\n\nReply STOP to opt out. Reply HELP for help.'
      })
    });

    const surgeResult = await surgeResponse.json();

    if (!surgeResponse.ok) {
      console.error('[SMS_SEND] Surge API error:', surgeResult);
      return res.status(500).json({
        error: 'Failed to send SMS',
        details: surgeResult.error || 'Surge API error'
      });
    }

    // Store outbound message in database
    try {
      await supabase
        .from('messages')
        .insert({
          business_id: '674fedc5-7937-4054-bffd-e4ecc22abc1d',
          customer_id: null,
          direction: 'outbound',
          channel: 'sms',
          body: body + '\n\nReply STOP to opt out. Reply HELP for help.',
          status: surgeResult.status || 'sent',
          surge_message_id: surgeResult.message_id || surgeResult.id,
          error: null
        });
    } catch (dbError) {
      console.log('[SMS_SEND] Database insert failed (non-critical):', dbError.message);
    }

    console.log('[SMS_SEND] Message sent successfully:', surgeResult.message_id || surgeResult.id);

    return res.status(200).json({
      success: true,
      message_id: surgeResult.message_id || surgeResult.id,
      status: surgeResult.status || 'sent',
      to: e164Phone
    });

  } catch (error) {
    console.error('[SMS_SEND] Error:', error);
    return res.status(500).json({
      error: 'Failed to send SMS',
      details: error.message
    });
  }
}
