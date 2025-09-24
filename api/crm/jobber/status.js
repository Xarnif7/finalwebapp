import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    // Get connection status
    const { data: connection, error } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('business_id', businessId)
      .eq('crm_type', 'jobber')
      .eq('status', 'connected')
      .single();

    if (error || !connection) {
      return res.status(200).json({
        connected: false,
        status: 'disconnected'
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(connection.token_expires_at);
    
    if (now > expiresAt) {
      // Token expired, try to refresh
      try {
        const refreshedConnection = await refreshJobberToken(connection);
        return res.status(200).json({
          connected: true,
          status: 'connected',
          lastSync: refreshedConnection.updated_at,
          webhookUrl: connection.webhook_url
        });
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return res.status(200).json({
          connected: false,
          status: 'token_expired'
        });
      }
    }

    return res.status(200).json({
      connected: true,
      status: 'connected',
      lastSync: connection.connected_at,
      webhookUrl: connection.webhook_url
    });

  } catch (error) {
    console.error('Jobber status check error:', error);
    return res.status(500).json({ 
      error: 'Failed to check Jobber connection status' 
    });
  }
}

async function refreshJobberToken(connection) {
  const tokenResponse = await fetch('https://api.getjobber.com/api/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.JOBBER_CLIENT_ID,
      client_secret: process.env.JOBBER_CLIENT_SECRET,
      refresh_token: connection.refresh_token
    })
  });

  if (!tokenResponse.ok) {
    throw new Error('Token refresh failed');
  }

  const tokenData = await tokenResponse.json();

  // Update the connection with new tokens
  const { data: updatedConnection, error } = await supabase
    .from('crm_connections')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', connection.id)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update tokens');
  }

  return updatedConnection;
}
