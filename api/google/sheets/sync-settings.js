import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get sync settings
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

      // Verify user has access to this business
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || profile.business_id !== business_id) {
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }

      // Get sync settings
      const { data: settings, error: settingsError } = await supabase
        .from('google_sheets_sync_settings')
        .select('*')
        .eq('business_id', business_id);

      res.json({
        ok: true,
        settings: settings || []
      });

    } catch (error) {
      console.error('[GOOGLE_SHEETS_SYNC_SETTINGS] Error:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Save sync settings
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return res.status(401).json({ ok: false, error: 'Invalid token' });
      }

      const { business_id, spreadsheet_id, sheet_name, auto_sync_enabled } = req.body;
      
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

      // Upsert sync settings
      const { data: settings, error: settingsError } = await supabase
        .from('google_sheets_sync_settings')
        .upsert({
          business_id,
          spreadsheet_id,
          sheet_name,
          auto_sync_enabled: auto_sync_enabled || false,
          webhook_url: auto_sync_enabled ? `${process.env.APP_BASE_URL}/api/google/sheets/webhook` : null,
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'business_id,spreadsheet_id'
        })
        .select('*');

      if (settingsError) {
        console.error('[GOOGLE_SHEETS_SYNC_SETTINGS] Error saving settings:', settingsError);
        return res.status(500).json({ ok: false, error: 'Failed to save sync settings' });
      }

      res.json({
        ok: true,
        settings: settings[0]
      });

    } catch (error) {
      console.error('[GOOGLE_SHEETS_SYNC_SETTINGS] Error:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
}
