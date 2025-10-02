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

    const { business_id, spreadsheet_id } = req.query;
    if (!business_id || !spreadsheet_id) {
      return res.status(400).json({ ok: false, error: 'Business ID and Spreadsheet ID are required' });
    }

    // Verify user has access to this business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.business_id !== business_id) {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }

    // Get stored tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_oauth_tokens')
      .select('*')
      .eq('business_id', business_id)
      .eq('user_email', user.email)
      .single();

    if (tokenError || !tokenData) {
      return res.status(400).json({ ok: false, error: 'Google Sheets not connected' });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_SHEETS_CLIENT_ID,
      process.env.GOOGLE_SHEETS_CLIENT_SECRET,
      process.env.GOOGLE_SHEETS_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    // Get the sheets service
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // Get spreadsheet metadata to find sheet names
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheet_id
    });

    const sheetNames = response.data.sheets.map(sheet => sheet.properties.title);

    res.json({
      ok: true,
      sheets: sheetNames
    });

  } catch (error) {
    console.error('[GOOGLE_SHEETS_SHEETS] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
