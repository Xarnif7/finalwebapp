import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Verify business exists
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return res.status(400).send(`
        <html>
          <body>
            <h1>QuickBooks Connection Failed</h1>
            <p>Business not found. Please try again.</p>
            <script>
              window.close();
            </script>
          </body>
        </html>
      `);
    }

    console.log(`[QBO] Processing callback for business ${businessId}, realm ${realmId}`);

    // Exchange authorization code for access token
    const clientId = process.env.QBO_CLIENT_ID;
    const clientSecret = process.env.QBO_CLIENT_SECRET;
    const redirectUri = process.env.QBO_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('[QBO] Missing QBO environment variables');
      return res.status(500).send(`
        <html>
          <body>
            <h1>QuickBooks Connection Failed</h1>
            <p>Configuration error. Please contact support.</p>
            <script>
              window.close();
            </script>
          </body>
        </html>
      `);
    }

    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('[QBO] Token exchange failed:', errorData);
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

    console.log('[QBO] Successfully exchanged code for tokens');

    // Calculate token expiration time
    const tokenExpiresAt = new Date(Date.now() + (expires_in * 1000));

    // Store the connection in integrations_quickbooks table
    const { data: integration, error: integrationError } = await supabase
      .from('integrations_quickbooks')
      .upsert({
        business_id: businessId,
        realm_id: realmId,
        access_token: access_token,
        refresh_token: refresh_token,
        token_expires_at: tokenExpiresAt.toISOString(),
        connection_status: 'connected',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'business_id,realm_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (integrationError) {
      console.error('[QBO] Database error:', integrationError);
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

    console.log(`[QBO] Successfully connected business ${businessId} to QuickBooks realm ${realmId}`);

    // Return success page
    return res.status(200).send(`
      <html>
        <body>
          <h1>QuickBooks Connected Successfully!</h1>
          <p>Your QuickBooks account has been connected to Blipp.</p>
          <p>You can now sync customers and set up automated review requests.</p>
          <script>
            // Notify parent window of successful connection
            if (window.opener) {
              window.opener.postMessage({
                type: 'QBO_CONNECT_SUCCESS',
                businessId: '${businessId}',
                realmId: '${realmId}'
              }, '*');
            }
            // Close the popup after a short delay
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('[QBO] Callback error:', error);
    return res.status(500).send(`
      <html>
        <body>
          <h1>QuickBooks Connection Failed</h1>
          <p>An unexpected error occurred. Please try again.</p>
          <script>
            window.close();
          </script>
        </body>
      </html>
    `);
  }
}
