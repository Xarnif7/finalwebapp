import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[JOBBER_CALLBACK] OAuth callback received');
    const { code, state, error } = req.query;

    if (error) {
      console.error('[JOBBER_CALLBACK] OAuth error:', error);
      return res.redirect(`${process.env.APP_BASE_URL || 'http://localhost:5173'}/settings?jobber_error=${error}`);
    }

    if (!code) {
      console.error('[JOBBER_CALLBACK] No authorization code received');
      return res.redirect(`${process.env.APP_BASE_URL || 'http://localhost:5173'}/settings?jobber_error=no_code`);
    }

    console.log('[JOBBER_CALLBACK] Exchanging code for tokens...');

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.getjobber.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.JOBBER_CLIENT_ID,
        client_secret: process.env.JOBBER_CLIENT_SECRET,
        redirect_uri: process.env.JOBBER_REDIRECT_URI || `${process.env.APP_BASE_URL}/api/crm/jobber/callback`,
        code: code
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[JOBBER_CALLBACK] Token exchange failed:', errorData);
      return res.redirect(`${process.env.APP_BASE_URL || 'http://localhost:5173'}/settings?jobber_error=token_failed`);
    }

    const tokens = await tokenResponse.json();
    console.log('[JOBBER_CALLBACK] Tokens received:', {
      has_access_token: !!tokens.access_token,
      has_refresh_token: !!tokens.refresh_token,
      expires_in: tokens.expires_in
    });

    // Get Jobber account info
    let accountId = null;
    let accountName = null;
    
    try {
      const accountResponse = await fetch('https://api.getjobber.com/api/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `{
            account {
              id
              name
            }
          }`
        })
      });

      if (accountResponse.ok) {
        const accountData = await accountResponse.json();
        accountId = accountData?.data?.account?.id;
        accountName = accountData?.data?.account?.name;
        console.log('[JOBBER_CALLBACK] Account info:', { accountId, accountName });
      }
    } catch (accountError) {
      console.error('[JOBBER_CALLBACK] Failed to fetch account info:', accountError);
    }

    // Determine business_id from state or from query
    let businessId = state; // State should contain business_id
    
    if (!businessId || businessId.length < 30) {
      // State might be a random string, try to find from existing connection
      const { data: existingConnection } = await supabase
        .from('crm_connections')
        .select('business_id')
        .eq('state', state)
        .eq('crm_type', 'jobber')
        .maybeSingle();
      
      if (existingConnection) {
        businessId = existingConnection.business_id;
      }
    }

    if (!businessId) {
      console.error('[JOBBER_CALLBACK] Could not determine business_id');
      return res.redirect(`${process.env.APP_BASE_URL || 'http://localhost:5173'}/settings?jobber_error=no_business`);
    }

    console.log('[JOBBER_CALLBACK] Saving integration for business:', businessId);

    // Save to integrations_jobber table
    const { data: integration, error: integrationError } = await supabase
      .from('integrations_jobber')
      .upsert({
        business_id: businessId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        account_id: accountId,
        account_name: accountName,
        connection_status: 'connected',
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'business_id'
      })
      .select()
      .single();

    if (integrationError) {
      console.error('[JOBBER_CALLBACK] Failed to save integration:', integrationError);
      return res.redirect(`${process.env.APP_BASE_URL || 'http://localhost:5173'}/settings?jobber_error=save_failed`);
    }

    console.log('[JOBBER_CALLBACK] Integration saved:', integration.id);

    // Set up webhook for Jobber events
    try {
      await setupJobberWebhook(tokens.access_token, businessId, integration.id);
    } catch (webhookError) {
      console.error('[JOBBER_CALLBACK] Webhook setup failed:', webhookError);
      // Don't fail the connection if webhook setup fails
    }

    // Trigger initial customer sync
    try {
      console.log('[JOBBER_CALLBACK] Triggering initial customer sync...');
      await fetch(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/crm/jobber/sync-customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId })
      });
      console.log('[JOBBER_CALLBACK] Customer sync initiated');
    } catch (syncError) {
      console.error('[JOBBER_CALLBACK] Customer sync failed:', syncError);
      // Don't fail connection if sync fails
    }

    console.log('✅ [JOBBER_CALLBACK] Jobber connected successfully!');
    
    // Return HTML page that closes popup and notifies parent window
    return res.status(200).send(`
      <html>
        <body>
          <h1>Jobber Connected Successfully!</h1>
          <p>Your Jobber account has been connected to Blipp.</p>
          <p>You can now sync customers and set up automated review requests.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'JOBBER_CONNECTED', accountName: '${accountName || 'Jobber Account'}' }, '${process.env.APP_BASE_URL || window.location.origin}');
              window.close();
            } else {
              window.location.href = '${process.env.APP_BASE_URL || 'http://localhost:5173'}/dashboard?jobber_connected=true';
            }
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('[JOBBER_CALLBACK] Fatal error:', error);
    
    return res.status(500).send(`
      <html>
        <body>
          <h1>Jobber Connection Failed</h1>
          <p>An unexpected error occurred. Please try again.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'JOBBER_ERROR', error: '${error.message || 'Connection failed'}' }, '${process.env.APP_BASE_URL || window.location.origin}');
              window.close();
            } else {
              window.location.href = '${process.env.APP_BASE_URL || 'http://localhost:5173'}/dashboard?jobber_error=callback_failed';
            }
          </script>
        </body>
      </html>
    `);
  }
}

async function setupJobberWebhook(accessToken, businessId, integrationId) {
  // Set up webhook to receive job completion events
  const webhookUrl = `${process.env.APP_BASE_URL || 'https://myblipp.com'}/api/crm/jobber/webhook`;
  
  console.log('[JOBBER_CALLBACK] Setting up webhook:', webhookUrl);
  const webhookResponse = await fetch('https://api.getjobber.com/api/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        mutation CreateWebhook($input: CreateWebhookInput!) {
          createWebhook(input: $input) {
            webhook {
              id
              url
              events
            }
          }
        }
      `,
      variables: {
        input: {
          url: webhookUrl,
          events: ['job:complete', 'job:close']  // Listen for job completion events
        }
      }
    })
  });

  if (webhookResponse.ok) {
    const webhookData = await webhookResponse.json();
    const webhookId = webhookData?.data?.createWebhook?.webhook?.id;
    console.log('[JOBBER_CALLBACK] Webhook created:', webhookId);
    
    // Store webhook ID in integrations_jobber table
    await supabase
      .from('integrations_jobber')
      .update({
        webhook_id: webhookId,
        webhook_url: webhookUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', integrationId);
    
    console.log('✅ [JOBBER_CALLBACK] Webhook configured successfully');
  } else {
    const errorText = await webhookResponse.text();
    console.error('[JOBBER_CALLBACK] Failed to create webhook:', errorText);
  }
}
