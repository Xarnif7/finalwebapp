import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[QBO] Running migration...');

    // Check if tables already exist
    const { data: existingTables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['integrations_quickbooks', 'qbo_import_logs']);

    if (checkError) {
      console.error('[QBO] Error checking existing tables:', checkError);
      return res.status(500).json({ 
        error: 'Failed to check existing tables',
        details: checkError.message 
      });
    }

    const existingTableNames = existingTables?.map(t => t.table_name) || [];
    
    if (existingTableNames.includes('integrations_quickbooks') && existingTableNames.includes('qbo_import_logs')) {
      return res.status(200).json({
        success: true,
        message: 'Migration already completed - tables exist',
        existingTables: existingTableNames
      });
    }

    // Migration SQL
    const migrationSQL = `
-- Create enum for connection status
CREATE TYPE IF NOT EXISTS qbo_connection_status AS ENUM ('connected', 'expired', 'revoked', 'error');

-- Create integrations_quickbooks table (if not exists)
CREATE TABLE IF NOT EXISTS integrations_quickbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    realm_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    connection_status qbo_connection_status DEFAULT 'connected',
    last_full_sync_at TIMESTAMPTZ,
    last_delta_sync_at TIMESTAMPTZ,
    last_webhook_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, realm_id)
);

-- Create qbo_import_logs table (if not exists)
CREATE TABLE IF NOT EXISTS qbo_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('customers', 'invoices')),
    run_started_at TIMESTAMPTZ DEFAULT NOW(),
    run_finished_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
    records_found INTEGER DEFAULT 0,
    records_upserted INTEGER DEFAULT 0,
    error_message TEXT
);

-- Add columns to customers table (only if missing)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS external_source TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS external_meta JSONB DEFAULT '{}'::jsonb;

-- Create indexes (if not exists)
CREATE INDEX IF NOT EXISTS idx_integrations_quickbooks_business_id ON integrations_quickbooks(business_id);
CREATE INDEX IF NOT EXISTS idx_integrations_quickbooks_realm_id ON integrations_quickbooks(realm_id);
CREATE INDEX IF NOT EXISTS idx_integrations_quickbooks_status ON integrations_quickbooks(connection_status);
CREATE INDEX IF NOT EXISTS idx_qbo_import_logs_business_id ON qbo_import_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_qbo_import_logs_type ON qbo_import_logs(type);
CREATE INDEX IF NOT EXISTS idx_qbo_import_logs_status ON qbo_import_logs(status);
CREATE INDEX IF NOT EXISTS idx_customers_external_source ON customers(business_id, external_source, external_id);

-- Enable RLS on new tables
ALTER TABLE integrations_quickbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_import_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integrations_quickbooks
CREATE POLICY IF NOT EXISTS "Users can view their own QuickBooks integrations" ON integrations_quickbooks
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can insert QuickBooks integrations for their businesses" ON integrations_quickbooks
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can update their own QuickBooks integrations" ON integrations_quickbooks
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can delete their own QuickBooks integrations" ON integrations_quickbooks
    FOR DELETE USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

-- RLS Policies for qbo_import_logs
CREATE POLICY IF NOT EXISTS "Users can view their own QBO import logs" ON qbo_import_logs
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can insert QBO import logs for their businesses" ON qbo_import_logs
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );
`;

    // Execute migration using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('[QBO] Migration failed:', error);
      return res.status(500).json({ 
        error: 'Migration failed',
        details: error.message 
      });
    }

    // Verify tables were created
    const { data: newTables, error: verifyError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['integrations_quickbooks', 'qbo_import_logs']);

    if (verifyError) {
      console.error('[QBO] Could not verify tables:', verifyError);
    }

    const newTableNames = newTables?.map(t => t.table_name) || [];

    console.log('[QBO] Migration completed successfully');

    return res.status(200).json({
      success: true,
      message: 'Migration completed successfully',
      createdTables: newTableNames,
      existingTables: existingTableNames
    });

  } catch (error) {
    console.error('[QBO] Migration error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
