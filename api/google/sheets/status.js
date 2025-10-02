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
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    const { business_id } = req.query;
    if (!business_id) {
      return res.status(400).json({ ok: false, error: 'Business ID required' });
    }

    // Get stored tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_oauth_tokens')
      .select('*')
      .eq('business_id', business_id)
      .eq('user_email', user.email)
      .single();

    if (tokenError || !tokenData) {
      return res.json({ 
        ok: true, 
        connected: false, 
        token_valid: false,
        message: 'No Google Sheets connection found'
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now >= expiresAt) {
      // Try to refresh the token
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_SHEETS_CLIENT_ID,
          process.env.GOOGLE_SHEETS_CLIENT_SECRET,
          process.env.GOOGLE_SHEETS_REDIRECT_URI
        );

        oauth2Client.setCredentials({
          refresh_token: tokenData.refresh_token
        });

        const { credentials } = await oauth2Client.refreshAccessToken();
        
        // Update tokens in database
        await supabase
          .from('google_oauth_tokens')
          .update({
            access_token: credentials.access_token,
            expires_at: new Date(credentials.expiry_date).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', tokenData.id);

        return res.json({ 
          ok: true, 
          connected: true, 
          token_valid: true,
          message: 'Google Sheets connection refreshed'
        });
      } catch (refreshError) {
        console.error('[GOOGLE_SHEETS_STATUS] Token refresh failed:', refreshError);
        return res.json({ 
          ok: true, 
          connected: true, 
          token_valid: false,
          message: 'Token expired and refresh failed'
        });
      }
    }

    // Test the connection
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_SHEETS_CLIENT_ID,
        process.env.GOOGLE_SHEETS_CLIENT_SECRET,
        process.env.GOOGLE_SHEETS_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token
      });

      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      await sheets.spreadsheets.list({ pageSize: 1 });

      res.json({ 
        ok: true, 
        connected: true, 
        token_valid: true,
        message: 'Google Sheets connection is active'
      });
    } catch (testError) {
      console.error('[GOOGLE_SHEETS_STATUS] Connection test failed:', testError);
      res.json({ 
        ok: true, 
        connected: true, 
        token_valid: false,
        message: 'Connection test failed'
      });
    }

  } catch (error) {
    console.error('[GOOGLE_SHEETS_STATUS] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
