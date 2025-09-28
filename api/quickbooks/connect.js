import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id, code, realmId } = req.body;

    if (!business_id || !code || !realmId) {
      return res.status(400).json({ 
        error: 'Missing required fields: business_id, code, realmId' 
      });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.QUICKBOOKS_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('[QUICKBOOKS] Token exchange failed:', errorData);
      return res.status(400).json({ 
        error: 'Failed to exchange authorization code for access token',
        details: errorData
      });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Store the connection in database
    const { data: integration, error: integrationError } = await supabase
      .from('business_integrations')
      .upsert({
        business_id: business_id,
        provider: 'quickbooks',
        status: 'active',
        metadata_json: {
          access_token,
          refresh_token,
          expires_in,
          realm_id: realmId,
          connected_at: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'business_id,provider',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (integrationError) {
      console.error('[QUICKBOOKS] Database error:', integrationError);
      return res.status(500).json({ 
        error: 'Failed to save QuickBooks connection',
        details: integrationError
      });
    }

    console.log('[QUICKBOOKS] Successfully connected business:', business_id);

    return res.status(200).json({
      success: true,
      message: 'QuickBooks connected successfully',
      integration_id: integration.id
    });

  } catch (error) {
    console.error('[QUICKBOOKS] Connection error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
