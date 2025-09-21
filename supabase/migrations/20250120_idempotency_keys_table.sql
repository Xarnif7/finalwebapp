-- Create idempotency_keys table for webhook deduplication
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    key TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours') NOT NULL
);

-- Add foreign key constraint to businesses table
ALTER TABLE idempotency_keys 
ADD CONSTRAINT idempotency_keys_business_id_fkey 
FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

-- Create unique index on business_id + key for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_keys_business_key 
ON idempotency_keys(business_id, key);

-- Create index on expires_at for cleanup
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at 
ON idempotency_keys(expires_at);

-- Enable RLS
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view idempotency_keys for their business"
ON idempotency_keys FOR SELECT
TO authenticated
USING (business_id = (SELECT id FROM businesses WHERE created_by = auth.uid()));

CREATE POLICY "Users can insert idempotency_keys for their business"
ON idempotency_keys FOR INSERT
TO authenticated
WITH CHECK (business_id = (SELECT id FROM businesses WHERE created_by = auth.uid()));

-- Add last_webhook_at column to business_integrations if it doesn't exist
ALTER TABLE business_integrations 
ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMPTZ;

-- Create function to clean up expired idempotency keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void AS $$
BEGIN
    DELETE FROM idempotency_keys WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create index on business_integrations for last_webhook_at lookups
CREATE INDEX IF NOT EXISTS idx_business_integrations_last_webhook_at 
ON business_integrations(business_id, last_webhook_at);
