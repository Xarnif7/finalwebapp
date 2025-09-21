-- Add zapier_token column to businesses table for multi-tenant Zapier integration
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS zapier_token TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_businesses_zapier_token ON businesses(zapier_token);

-- Generate unique tokens for existing businesses
UPDATE businesses 
SET zapier_token = 'blipp_' || encode(gen_random_bytes(16), 'hex')
WHERE zapier_token IS NULL;
