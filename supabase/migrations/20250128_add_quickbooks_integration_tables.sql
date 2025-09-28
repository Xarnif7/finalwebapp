-- Migration: Add QuickBooks integration storage and logs
-- Created: 2025-01-28
-- Description: Add QBO integration storage and logs, plus small, non-breaking columns on customers
-- Everything is idempotent and additive only

-- Create enum for connection status
CREATE TYPE IF NOT EXISTS qbo_connection_status AS ENUM ('connected', 'expired', 'revoked', 'error');

-- Create integrations_quickbooks table (if not exists)
CREATE TABLE IF NOT EXISTS integrations_quickbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    realm_id TEXT NOT NULL,
    access_token TEXT, -- Store encrypted tokens
    refresh_token TEXT, -- Store encrypted tokens
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
CREATE INDEX IF NOT EXISTS idx_integrations_quickbooks_business_id 
    ON integrations_quickbooks(business_id);

CREATE INDEX IF NOT EXISTS idx_integrations_quickbooks_realm_id 
    ON integrations_quickbooks(realm_id);

CREATE INDEX IF NOT EXISTS idx_integrations_quickbooks_status 
    ON integrations_quickbooks(connection_status);

CREATE INDEX IF NOT EXISTS idx_qbo_import_logs_business_id 
    ON qbo_import_logs(business_id);

CREATE INDEX IF NOT EXISTS idx_qbo_import_logs_type 
    ON qbo_import_logs(type);

CREATE INDEX IF NOT EXISTS idx_qbo_import_logs_status 
    ON qbo_import_logs(status);

CREATE INDEX IF NOT EXISTS idx_customers_external_source 
    ON customers(business_id, external_source, external_id);

-- Enable RLS on new tables
ALTER TABLE integrations_quickbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_import_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integrations_quickbooks
CREATE POLICY "Users can view their own QuickBooks integrations" ON integrations_quickbooks
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert QuickBooks integrations for their businesses" ON integrations_quickbooks
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own QuickBooks integrations" ON integrations_quickbooks
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own QuickBooks integrations" ON integrations_quickbooks
    FOR DELETE USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

-- RLS Policies for qbo_import_logs
CREATE POLICY "Users can view their own QBO import logs" ON qbo_import_logs
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert QBO import logs for their businesses" ON qbo_import_logs
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

-- Add comments for documentation
COMMENT ON TABLE integrations_quickbooks IS 'Stores QuickBooks Online integration credentials and status for each business';
COMMENT ON TABLE qbo_import_logs IS 'Logs all QuickBooks import operations for debugging and monitoring';
COMMENT ON COLUMN customers.external_source IS 'Source system: qbo, csv, manual, zapier';
COMMENT ON COLUMN customers.external_id IS 'External system ID for the customer';
COMMENT ON COLUMN customers.external_meta IS 'Additional metadata from external system';
