import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state, realmId } = req.query;

    if (!code || !state || !realmId) {
      return res.status(400).send(`
        <html>
          <body>
            <h1>QuickBooks Connection Failed</h1>
            <p>Missing required parameters. Please try again.</p>
            <script>
              window.close();
            </script>
          </body>
        </html>
      `);
    }

    // Parse state to get business_id
    const businessId = state;

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
      return res.status(400).send(`
        <html>
          <body>
            <h1>QuickBooks Connection Failed</h1>
            <p>Failed to exchange authorization code. Please try again.</p>
            <script>
              window.close();
            </script>
          </body>
        </html>
      `);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Store the connection in database
    const { data: integration, error: integrationError } = await supabase
      .from('business_integrations')
      .upsert({
        business_id: businessId,
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
      return res.status(500).send(`
        <html>
          <body>
            <h1>QuickBooks Connection Failed</h1>
            <p>Failed to save connection. Please try again.</p>
            <script>
              window.close();
            </script>
          </body>
        </html>
      `);
    }

    console.log('[QUICKBOOKS] Successfully connected business:', businessId);

    return res.status(200).send(`
      <html>
        <body>
          <h1>QuickBooks Connected Successfully!</h1>
          <p>Your QuickBooks account has been connected to Blipp.</p>
          <p>You can now sync customers and set up automated review requests.</p>
          <script>
            // Notify parent window and close
            if (window.opener) {
              window.opener.postMessage({
                type: 'QUICKBOOKS_CONNECTED',
                success: true,
                businessId: '${businessId}'
              }, '*');
            }
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('[QUICKBOOKS] Callback error:', error);
    return res.status(500).send(`
      <html>
        <body>
          <h1>QuickBooks Connection Failed</h1>
          <p>An error occurred. Please try again.</p>
          <script>
            window.close();
          </script>
        </body>
      </html>
    `);
  }
}
