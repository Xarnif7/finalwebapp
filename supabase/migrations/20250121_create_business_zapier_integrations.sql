-- Create table to store business Zapier integrations
CREATE TABLE IF NOT EXISTS business_zapier_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  zapier_account_email TEXT NOT NULL,
  zap_config JSONB NOT NULL DEFAULT '{}',
  webhook_url TEXT,
  webhook_secret TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'error', 'disconnected')),
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_zapier_integrations_business_id ON business_zapier_integrations(business_id);
CREATE INDEX IF NOT EXISTS idx_business_zapier_integrations_zapier_email ON business_zapier_integrations(zapier_account_email);
CREATE INDEX IF NOT EXISTS idx_business_zapier_integrations_status ON business_zapier_integrations(status);

-- Enable RLS
ALTER TABLE business_zapier_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their Zapier integrations" ON business_zapier_integrations
FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.uid()));

CREATE POLICY "Users can insert their Zapier integrations" ON business_zapier_integrations
FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE created_by = auth.uid()));

CREATE POLICY "Users can update their Zapier integrations" ON business_zapier_integrations
FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.uid()));

CREATE POLICY "Users can delete their Zapier integrations" ON business_zapier_integrations
FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.uid()));
