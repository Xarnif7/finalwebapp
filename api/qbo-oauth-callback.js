import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Buffer } from 'buffer';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, realmId } = req.query;

  if (!code || !state || !realmId) {
    console.error('[QBO] Missing code, state, or realmId in callback.');
    return res.status(400).send(`
      <html>
        <body>
          <h1>QuickBooks Connection Failed</h1>
          <p>Missing authorization parameters. Please try again.</p>
          <script>
            window.close();
          </script>
        </body>
      </html>
    `);
  }

  // Parse state to get business_id
  const businessId = state;

  console.log(`[QBO] Processing callback for business ${businessId}, realm ${realmId}`);

  // Exchange authorization code for access token
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  const redirectUri = process.env.QBO_REDIRECT_URI;

  console.log('[QBO] Callback environment variables:', {
    clientId: clientId ? 'SET' : 'MISSING',
    clientSecret: clientSecret ? 'SET' : 'MISSING',
    redirectUri: redirectUri || 'MISSING'
  });

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('[QBO] Missing QBO environment variables:', {
      clientId: !!clientId,
      clientSecret: !!clientSecret,
      redirectUri: !!redirectUri
    });
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

  try {
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
      const errorBody = await tokenResponse.json();
      console.error('[QBO] Token exchange failed:', tokenResponse.status, errorBody);
      return res.status(tokenResponse.status).send(`
        <html>
          <body>
            <h1>QuickBooks Connection Failed</h1>
            <p>Failed to get access token. Please try again.</p>
            <script>
              window.close();
            </script>
          </body>
        </html>
      `);
    }

    const tokenData = await tokenResponse.json();
    const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)); // expires_in is in seconds

    // Store or update integration details
    const { data: existingIntegration, error: fetchError } = await supabase
      .from('integrations_quickbooks')
      .select('*')
      .eq('business_id', businessId)
      .eq('realm_id', realmId)
      .single();

    let upsertError;
    if (existingIntegration) {
      const { error } = await supabase
        .from('integrations_quickbooks')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenExpiresAt.toISOString(),
          connection_status: 'connected',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingIntegration.id);
      upsertError = error;
    } else {
      const { error } = await supabase
        .from('integrations_quickbooks')
        .insert({
          business_id: businessId,
          realm_id: realmId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenExpiresAt.toISOString(),
          connection_status: 'connected'
        });
      upsertError = error;
    }

    if (upsertError) {
      console.error('[QBO] Failed to save QuickBooks integration:', upsertError);
      return res.status(500).send(`
        <html>
          <body>
            <h1>QuickBooks Connection Failed</h1>
            <p>Failed to save connection details. Please try again.</p>
            <script>
              window.close();
            </script>
          </body>
        </html>
      `);
    }

    console.log(`[QBO] Successfully connected business ${businessId} to QuickBooks realm ${realmId}`);

    // Redirect back to the app or show success message
    return res.status(200).send(`
      <html>
        <body>
          <h1>QuickBooks Connected Successfully!</h1>
          <p>Your QuickBooks account has been connected to Blipp.</p>
          <p>You can now sync customers and set up automated review requests.</p>
          <script>
            window.opener.postMessage({ type: 'QUICKBOOKS_CONNECTED' }, '${process.env.VITE_SITE_URL || window.location.origin}');
            window.close();
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
