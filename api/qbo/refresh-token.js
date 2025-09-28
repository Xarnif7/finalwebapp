import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id, realm_id } = req.body;

    if (!business_id || !realm_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: business_id, realm_id' 
      });
    }

    // Get the integration record
    const { data: integration, error: integrationError } = await supabase
      .from('integrations_quickbooks')
      .select('id, access_token, refresh_token, connection_status')
      .eq('business_id', business_id)
      .eq('realm_id', realm_id)
      .single();

    if (integrationError || !integration) {
      return res.status(404).json({ 
        error: 'QuickBooks integration not found' 
      });
    }

    if (!integration.refresh_token) {
      return res.status(400).json({ 
        error: 'No refresh token available' 
      });
    }

    console.log(`[QBO] Refreshing token for business ${business_id}, realm ${realm_id}`);

    // Exchange refresh token for new access token
    const clientId = process.env.QBO_CLIENT_ID;
    const clientSecret = process.env.QBO_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('[QBO] Missing QBO environment variables');
      return res.status(500).json({ 
        error: 'QuickBooks integration not configured' 
      });
    }

    const refreshResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: integration.refresh_token
      })
    });

    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.json();
      console.error('[QBO] Token refresh failed:', errorData);
      
      // Mark connection as expired if refresh fails
      await supabase
        .from('integrations_quickbooks')
        .update({
          connection_status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', integration.id);

      return res.status(401).json({ 
        error: 'Token refresh failed',
        details: errorData.error_description || 'Invalid or expired refresh token'
      });
    }

    const tokenData = await refreshResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Calculate new token expiration time
    const tokenExpiresAt = new Date(Date.now() + (expires_in * 1000));

    // Update the integration with new tokens
    const { data: updatedIntegration, error: updateError } = await supabase
      .from('integrations_quickbooks')
      .update({
        access_token: access_token,
        refresh_token: refresh_token,
        token_expires_at: tokenExpiresAt.toISOString(),
        connection_status: 'connected',
        updated_at: new Date().toISOString()
      })
      .eq('id', integration.id)
      .select()
      .single();

    if (updateError) {
      console.error('[QBO] Failed to update tokens:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update tokens' 
      });
    }

    console.log(`[QBO] Successfully refreshed tokens for business ${business_id}`);

    return res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      expires_at: tokenExpiresAt.toISOString()
    });

  } catch (error) {
    console.error('[QBO] Refresh token error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
