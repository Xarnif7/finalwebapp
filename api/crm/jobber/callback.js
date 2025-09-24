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
    const { code, state, error } = req.query;

    if (error) {
      console.error('Jobber OAuth error:', error);
      return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/customers?jobber_error=${error}`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/customers?jobber_error=missing_parameters`);
    }

    // Verify state parameter
    const { data: connectionData, error: connectionError } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('state', state)
      .eq('crm_type', 'jobber')
      .eq('status', 'pending')
      .single();

    if (connectionError || !connectionData) {
      console.error('Invalid state parameter:', state);
      return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/customers?jobber_error=invalid_state`);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.getjobber.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.JOBBER_CLIENT_ID,
        client_secret: process.env.JOBBER_CLIENT_SECRET,
        redirect_uri: process.env.JOBBER_REDIRECT_URI,
        code: code
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/customers?jobber_error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    // Store the connection data
    await supabase
      .from('crm_connections')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
        status: 'connected',
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionData.id);

    // Set up webhook for Jobber
    try {
      await setupJobberWebhook(tokenData.access_token, connectionData.business_id);
    } catch (webhookError) {
      console.error('Webhook setup failed:', webhookError);
      // Don't fail the connection if webhook setup fails
    }

    return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/customers?jobber_connected=true`);

  } catch (error) {
    console.error('Jobber callback error:', error);
    return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/customers?jobber_error=callback_error`);
  }
}

async function setupJobberWebhook(accessToken, businessId) {
  // Set up webhook to receive job completion events
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/crm/jobber/webhook`;
  
  const webhookResponse = await fetch('https://api.getjobber.com/api/webhooks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: webhookUrl,
      events: ['job.closed'] // Use job.closed instead of job.completed
    })
  });

  if (webhookResponse.ok) {
    const webhookData = await webhookResponse.json();
    console.log('Jobber webhook created:', webhookData);
    
    // Store webhook ID for future management
    await supabase
      .from('crm_connections')
      .update({
        webhook_id: webhookData.id,
        webhook_url: webhookUrl,
        updated_at: new Date().toISOString()
      })
      .eq('business_id', businessId)
      .eq('crm_type', 'jobber');
  } else {
    console.error('Failed to create Jobber webhook:', await webhookResponse.text());
  }
}
