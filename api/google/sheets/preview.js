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

    const { business_id, spreadsheet_id, sheet_name } = req.query;
    if (!business_id || !spreadsheet_id || !sheet_name) {
      return res.status(400).json({ ok: false, error: 'Business ID, Spreadsheet ID, and Sheet Name are required' });
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

    // Read the data from the sheet (first 10 rows for preview)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheet_id,
      range: `${sheet_name}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return res.status(400).json({ ok: false, error: 'No data found in the sheet' });
    }

    // First row is headers
    const headers = rows[0];
    const dataRows = rows.slice(1, 6); // Only first 5 data rows for preview

    // Map headers to customer fields
    const headerMap = {
      'full_name': ['name', 'full name', 'fullname', 'customer name', 'client name'],
      'email': ['email', 'email address', 'e-mail'],
      'phone': ['phone', 'phone number', 'mobile', 'cell'],
      'service_date': ['service date', 'date', 'service', 'job date', 'completion date'],
      'tags': ['tags', 'tag', 'category', 'type'],
      'notes': ['notes', 'note', 'comments', 'description']
    };

    const fieldMapping = {};
    Object.entries(headerMap).forEach(([field, variations]) => {
      const header = headers.find(h => 
        variations.some(v => h.toLowerCase().includes(v.toLowerCase()))
      );
      if (header) {
        fieldMapping[field] = headers.indexOf(header);
      }
    });

    // Process the data for preview
    const preview = dataRows.map((row, index) => {
      const customer = {};
      Object.entries(fieldMapping).forEach(([field, columnIndex]) => {
        customer[field] = row[columnIndex] || '';
      });
      return customer;
    });

    res.json({
      ok: true,
      preview,
      headers,
      fieldMapping
    });

  } catch (error) {
    console.error('[GOOGLE_SHEETS_PREVIEW] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
