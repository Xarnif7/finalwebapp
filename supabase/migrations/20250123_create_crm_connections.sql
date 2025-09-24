-- Create CRM connections table to store OAuth tokens and connection status
CREATE TABLE IF NOT EXISTS crm_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  crm_type VARCHAR(50) NOT NULL, -- 'jobber', 'housecall_pro', 'servicetitan', etc.
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'connected', 'error'
  
  -- OAuth tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Webhook configuration
  webhook_id VARCHAR(255),
  webhook_url TEXT,
  webhook_secret TEXT,
  
  -- Connection metadata
  state VARCHAR(255), -- OAuth state parameter for security
  connected_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(business_id, crm_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_connections_business_id ON crm_connections(business_id);
CREATE INDEX IF NOT EXISTS idx_crm_connections_status ON crm_connections(status);
CREATE INDEX IF NOT EXISTS idx_crm_connections_type ON crm_connections(crm_type);

-- Add RLS policies
ALTER TABLE crm_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access connections for their business
CREATE POLICY "Users can access their business CRM connections" ON crm_connections
  FOR ALL USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.created_by = auth.email()
    )
  );

-- Policy: Service role can access all connections (for webhooks)
CREATE POLICY "Service role can access all CRM connections" ON crm_connections
  FOR ALL USING (auth.role() = 'service_role');

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_crm_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_connections_updated_at
  BEFORE UPDATE ON crm_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_connections_updated_at();

-- Add comments for documentation
COMMENT ON TABLE crm_connections IS 'Stores OAuth connections to external CRM systems like Jobber';
COMMENT ON COLUMN crm_connections.crm_type IS 'Type of CRM system: jobber, housecall_pro, servicetitan, etc.';
COMMENT ON COLUMN crm_connections.status IS 'Connection status: pending, connected, error';
COMMENT ON COLUMN crm_connections.state IS 'OAuth state parameter for security verification';
COMMENT ON COLUMN crm_connections.webhook_id IS 'ID of the webhook created in the CRM system';
COMMENT ON COLUMN crm_connections.webhook_url IS 'URL where CRM sends webhook notifications';
