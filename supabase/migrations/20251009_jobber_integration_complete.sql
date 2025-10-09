-- Complete Jobber Integration Schema
-- Matches integrations_quickbooks structure for consistency

-- Create integrations_jobber table (similar to integrations_quickbooks)
CREATE TABLE IF NOT EXISTS integrations_jobber (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- OAuth tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Jobber-specific data
  account_id TEXT,  -- Jobber account ID
  account_name TEXT,  -- Jobber account name
  
  -- Connection metadata
  connection_status TEXT DEFAULT 'pending' CHECK (connection_status IN ('pending', 'connected', 'disconnected', 'error')),
  error_message TEXT,
  
  -- Sync tracking
  last_customer_sync_at TIMESTAMPTZ,
  last_job_sync_at TIMESTAMPTZ,
  last_webhook_at TIMESTAMPTZ,
  
  -- Webhook configuration
  webhook_id TEXT,
  webhook_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  connected_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrations_jobber_business_id ON integrations_jobber(business_id);
CREATE INDEX IF NOT EXISTS idx_integrations_jobber_status ON integrations_jobber(connection_status);
CREATE INDEX IF NOT EXISTS idx_integrations_jobber_account_id ON integrations_jobber(account_id);
CREATE INDEX IF NOT EXISTS idx_integrations_jobber_token_expiry ON integrations_jobber(token_expires_at);

-- Create unique constraint - one Jobber integration per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_jobber_business_unique ON integrations_jobber(business_id);

-- Enable RLS
ALTER TABLE integrations_jobber ENABLE ROW LEVEL SECURITY;

-- RLS Policies (match QBO pattern)
DROP POLICY IF EXISTS "Users can view their business Jobber integrations" ON integrations_jobber;
CREATE POLICY "Users can view their business Jobber integrations" ON integrations_jobber
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Users can insert their business Jobber integrations" ON integrations_jobber;
CREATE POLICY "Users can insert their business Jobber integrations" ON integrations_jobber
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Users can update their business Jobber integrations" ON integrations_jobber;
CREATE POLICY "Users can update their business Jobber integrations" ON integrations_jobber
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Service role can access all Jobber integrations" ON integrations_jobber;
CREATE POLICY "Service role can access all Jobber integrations" ON integrations_jobber
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Migrate existing crm_connections data to integrations_jobber
INSERT INTO integrations_jobber (
  business_id,
  access_token,
  refresh_token,
  token_expires_at,
  connection_status,
  webhook_id,
  webhook_url,
  created_at,
  updated_at,
  connected_at
)
SELECT 
  business_id,
  access_token,
  refresh_token,
  token_expires_at,
  status,
  webhook_id,
  webhook_url,
  created_at,
  updated_at,
  connected_at
FROM crm_connections
WHERE crm_type = 'jobber'
ON CONFLICT (business_id) DO UPDATE
SET 
  access_token = EXCLUDED.access_token,
  refresh_token = EXCLUDED.refresh_token,
  token_expires_at = EXCLUDED.token_expires_at,
  connection_status = EXCLUDED.connection_status,
  updated_at = NOW();

