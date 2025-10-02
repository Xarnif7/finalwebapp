import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const { spreadsheet_id, sheet_name, business_id, auto_enroll } = req.body;
    
    if (!spreadsheet_id || !business_id) {
      return res.status(400).json({ ok: false, error: 'Spreadsheet ID and Business ID are required' });
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

    // Get spreadsheet metadata to find the sheet
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheet_id
    });

    const targetSheet = sheet_name || spreadsheet.data.sheets[0].properties.title;
    
    // Read the data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheet_id,
      range: `${targetSheet}!A:Z`, // Read all columns
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return res.status(400).json({ ok: false, error: 'No data found in the sheet' });
    }

    // First row is headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

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

    if (!fieldMapping.full_name) {
      return res.status(400).json({ 
        ok: false, 
        error: 'No name column found. Please ensure your sheet has a column for customer names.' 
      });
    }

    // Process the data
    const customers = dataRows.map((row, index) => {
      const customer = {
        business_id,
        full_name: row[fieldMapping.full_name] || '',
        email: fieldMapping.email ? row[fieldMapping.email] : '',
        phone: fieldMapping.phone ? row[fieldMapping.phone] : '',
        service_date: fieldMapping.service_date ? row[fieldMapping.service_date] : null,
        tags: fieldMapping.tags ? (row[fieldMapping.tags] || '').split(',').map(t => t.trim()).filter(Boolean) : [],
        notes: fieldMapping.notes ? row[fieldMapping.notes] : '',
        status: 'active',
        created_by: user.id
      };

      // Clean up data
      if (customer.email) {
        customer.email = customer.email.toLowerCase().trim();
        if (!/^\S+@\S+\.\S+$/.test(customer.email)) {
          customer.email = '';
        }
      }

      if (customer.phone) {
        customer.phone = customer.phone.replace(/\D/g, '');
        if (customer.phone.length < 7) {
          customer.phone = '';
        }
      }

      if (customer.service_date) {
        const date = new Date(customer.service_date);
        if (!isNaN(date.getTime())) {
          customer.service_date = date.toISOString().split('T')[0];
        } else {
          customer.service_date = null;
        }
      }

      return customer;
    }).filter(customer => customer.full_name.trim()); // Only include customers with names

    if (customers.length === 0) {
      return res.status(400).json({ ok: false, error: 'No valid customers found in the sheet' });
    }

    // Insert customers into database
    const { data: insertedCustomers, error: insertError } = await supabase
      .from('customers')
      .insert(customers)
      .select('id');

    if (insertError) {
      console.error('[GOOGLE_SHEETS_SYNC] Error inserting customers:', insertError);
      return res.status(500).json({ ok: false, error: 'Failed to import customers' });
    }

    // Handle auto-enrollment if requested
    let enrollmentSummary = null;
    if (auto_enroll && auto_enroll.enabled) {
      try {
        // Get the sequence
        const { data: sequence } = await supabase
          .from('sequences')
          .select('*')
          .eq('id', auto_enroll.sequence_id)
          .eq('business_id', business_id)
          .single();

        if (sequence) {
          // Enroll customers in the sequence
          const enrollments = insertedCustomers.map(customer => ({
            customer_id: customer.id,
            sequence_id: auto_enroll.sequence_id,
            business_id,
            status: 'pending',
            created_at: new Date().toISOString()
          }));

          const { error: enrollmentError } = await supabase
            .from('sequence_enrollments')
            .insert(enrollments);

          if (!enrollmentError) {
            enrollmentSummary = {
              enrolled: enrollments.length,
              skipped: 0,
              skippedReasons: {}
            };
          }
        }
      } catch (enrollmentError) {
        console.error('[GOOGLE_SHEETS_SYNC] Auto-enrollment error:', enrollmentError);
      }
    }

    res.json({
      ok: true,
      customers_imported: insertedCustomers.length,
      total_rows: dataRows.length,
      skipped: dataRows.length - insertedCustomers.length,
      enrollmentSummary
    });

  } catch (error) {
    console.error('[GOOGLE_SHEETS_SYNC] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
