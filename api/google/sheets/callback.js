import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ ok: false, error: 'Missing authorization code or state' });
    }

    // Parse state to get business info
    let stateData;
    try {
      stateData = JSON.parse(state);
    } catch (e) {
      return res.status(400).json({ ok: false, error: 'Invalid state parameter' });
    }

    const { business_id, user_id, user_email } = stateData;

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_SHEETS_CLIENT_ID,
      process.env.GOOGLE_SHEETS_CLIENT_SECRET,
      process.env.GOOGLE_SHEETS_REDIRECT_URI
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Store tokens in database
    const { error: insertError } = await supabase
      .from('google_oauth_tokens')
      .upsert({
        business_id,
        user_email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        expires_at: new Date(tokens.expiry_date).toISOString(),
        scope: tokens.scope,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'business_id,user_email'
      });

    if (insertError) {
      console.error('[GOOGLE_SHEETS_CALLBACK] Error storing tokens:', insertError);
      return res.status(500).json({ ok: false, error: 'Failed to store authentication tokens' });
    }

    // Test the connection by fetching user's sheets
    try {
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      const response = await sheets.spreadsheets.list({
        pageSize: 10,
        fields: 'files(id,name)'
      });

      console.log(`[GOOGLE_SHEETS_CALLBACK] Successfully connected to Google Sheets for business ${business_id}`);
      
      // Return success page
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Sheets Connected</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #4CAF50; }
            .container { max-width: 400px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">✅ Google Sheets Connected!</h1>
            <p>Your Google Sheets integration is now active.</p>
            <p>You can now sync customers from your Google Sheets.</p>
            <script>
              // Close the popup window
              window.close();
            </script>
          </div>
        </body>
        </html>
      `);
    } catch (testError) {
      console.error('[GOOGLE_SHEETS_CALLBACK] Error testing connection:', testError);
      return res.status(500).json({ ok: false, error: 'Failed to verify Google Sheets access' });
    }

  } catch (error) {
    console.error('[GOOGLE_SHEETS_CALLBACK] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
