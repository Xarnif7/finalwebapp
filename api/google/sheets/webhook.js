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
    // Verify webhook signature if needed (Google Drive API webhooks)
    const { business_id, spreadsheet_id, sheet_name } = req.body;
    
    if (!business_id || !spreadsheet_id) {
      return res.status(400).json({ ok: false, error: 'Business ID and Spreadsheet ID are required' });
    }

    // Get the business's Google Sheets connection
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_oauth_tokens')
      .select('*')
      .eq('business_id', business_id)
      .single();

    if (tokenError || !tokenData) {
      return res.status(400).json({ ok: false, error: 'Google Sheets not connected' });
    }

    // Check if auto-sync is enabled for this business
    const { data: syncSettings } = await supabase
      .from('google_sheets_sync_settings')
      .select('*')
      .eq('business_id', business_id)
      .eq('spreadsheet_id', spreadsheet_id)
      .eq('auto_sync_enabled', true)
      .single();

    if (!syncSettings) {
      return res.json({ ok: true, message: 'Auto-sync not enabled for this spreadsheet' });
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

    // Get spreadsheet metadata
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheet_id
    });

    const targetSheet = sheet_name || syncSettings.sheet_name || spreadsheet.data.sheets[0].properties.title;
    
    // Read the data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheet_id,
      range: `${targetSheet}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return res.json({ ok: true, message: 'No data found in the sheet' });
    }

    // Process the data (same logic as sync.js)
    const headers = rows[0];
    const dataRows = rows.slice(1);

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
        error: 'No name column found' 
      });
    }

    // Process customers
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
        created_by: tokenData.user_email
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
    }).filter(customer => customer.full_name.trim());

    if (customers.length === 0) {
      return res.json({ ok: true, message: 'No valid customers found' });
    }

    // Get existing customers for deduplication
    const { data: existingCustomers } = await supabase
      .from('customers')
      .select('id, full_name, email, phone')
      .eq('business_id', business_id);

    const existingMap = new Map();
    existingCustomers?.forEach(customer => {
      if (customer.email) {
        existingMap.set(customer.email.toLowerCase(), customer);
      }
      existingMap.set(customer.full_name.toLowerCase(), customer);
    });

    // Separate new customers from updates
    const newCustomers = [];
    const updatedCustomers = [];

    customers.forEach(customer => {
      const existingByEmail = customer.email ? existingMap.get(customer.email.toLowerCase()) : null;
      const existingByName = existingMap.get(customer.full_name.toLowerCase());
      const existing = existingByEmail || existingByName;

      if (existing) {
        const hasChanges = 
          existing.full_name !== customer.full_name ||
          existing.email !== customer.email ||
          existing.phone !== customer.phone;

        if (hasChanges) {
          updatedCustomers.push({
            ...customer,
            id: existing.id
          });
        }
      } else {
        newCustomers.push(customer);
      }
    });

    let inserted = 0;
    let updated = 0;

    // Insert new customers
    if (newCustomers.length > 0) {
      const { data: insertedData, error: insertError } = await supabase
        .from('customers')
        .insert(newCustomers)
        .select('id');

      if (!insertError) {
        inserted = insertedData.length;
      }
    }

    // Update existing customers
    if (updatedCustomers.length > 0) {
      for (const customer of updatedCustomers) {
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            full_name: customer.full_name,
            email: customer.email,
            phone: customer.phone,
            service_date: customer.service_date,
            tags: customer.tags,
            notes: customer.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', customer.id);

        if (!updateError) {
          updated++;
        }
      }
    }

    // Log the sync activity
    await supabase
      .from('google_sheets_sync_logs')
      .insert({
        business_id,
        spreadsheet_id,
        sheet_name: targetSheet,
        customers_inserted: inserted,
        customers_updated: updated,
        sync_type: 'auto',
        created_at: new Date().toISOString()
      });

    res.json({
      ok: true,
      customers_inserted: inserted,
      customers_updated: updated,
      message: `Auto-sync completed: ${inserted} new, ${updated} updated`
    });

  } catch (error) {
    console.error('[GOOGLE_SHEETS_WEBHOOK] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
