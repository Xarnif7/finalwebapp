import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Check Jobber Connection Status
 * Returns whether Jobber is connected for a business
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id } = req.query;

    if (!business_id) {
      return res.status(400).json({ error: 'business_id is required' });
    }

    // Get Jobber integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations_jobber')
      .select('*')
      .eq('business_id', business_id)
      .maybeSingle();

    if (integrationError) {
      console.error('[JOBBER_STATUS] Error fetching integration:', integrationError);
      return res.status(500).json({ error: 'Failed to check status' });
    }

    if (!integration) {
      return res.status(200).json({
        connected: false,
        connectionStatus: 'not_connected',
        message: 'Jobber not connected'
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null;
    const isExpired = !expiresAt || expiresAt <= now;

    // Auto-refresh if expired and refresh_token available
    if (isExpired && integration.refresh_token && process.env.JOBBER_CLIENT_ID && process.env.JOBBER_CLIENT_SECRET) {
      console.log('[JOBBER_STATUS] Token expired, attempting refresh...');
      
      try {
        const tokenResponse = await fetch('https://api.getjobber.com/api/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: process.env.JOBBER_CLIENT_ID,
            client_secret: process.env.JOBBER_CLIENT_SECRET,
            refresh_token: integration.refresh_token
          })
        });

        if (tokenResponse.ok) {
          const tokens = await tokenResponse.json();
          const newExpiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

          await supabase
            .from('integrations_jobber')
            .update({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token || integration.refresh_token,
              token_expires_at: newExpiresAt,
              connection_status: 'connected',
              updated_at: new Date().toISOString()
            })
            .eq('id', integration.id);

          console.log('✅ [JOBBER_STATUS] Token refreshed successfully');
          
          return res.status(200).json({
            connected: true,
            connectionStatus: 'connected',
            account_name: integration.account_name,
            last_sync: integration.last_customer_sync_at,
            token_expires_at: newExpiresAt
          });
        }
      } catch (refreshError) {
        console.error('[JOBBER_STATUS] Token refresh failed:', refreshError);
      }
    }

    const isConnected = integration.connection_status === 'connected' && !isExpired;

    return res.status(200).json({
      connected: isConnected,
      connectionStatus: isExpired ? 'token_expired' : integration.connection_status,
      account_name: integration.account_name,
      last_sync: integration.last_customer_sync_at,
      token_expires_at: integration.token_expires_at,
      needs_reconnection: isExpired && !integration.refresh_token
    });

  } catch (error) {
    console.error('[JOBBER_STATUS] Fatal error:', error);
    return res.status(500).json({ error: 'Failed to check Jobber connection status' });
  }
}
