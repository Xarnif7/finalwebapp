-- SMS System Migration
-- Adds support for Surge SMS integration with TFN verification

-- Add SMS columns to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS surge_account_id TEXT NULL,
ADD COLUMN IF NOT EXISTS surge_phone_id TEXT NULL,
ADD COLUMN IF NOT EXISTS from_number TEXT NULL,
ADD COLUMN IF NOT EXISTS sender_type TEXT NOT NULL DEFAULT 'tfn',
ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_verification_error TEXT NULL;

-- Add check constraint for verification_status
ALTER TABLE businesses
DROP CONSTRAINT IF EXISTS businesses_verification_status_check;

ALTER TABLE businesses
ADD CONSTRAINT businesses_verification_status_check 
CHECK (verification_status IN ('pending', 'active', 'action_needed', 'disabled'));

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NULL REFERENCES customers(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  channel TEXT NOT NULL DEFAULT 'sms',
  body TEXT NOT NULL,
  status TEXT NULL,
  error TEXT NULL,
  surge_message_id TEXT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS messages_business_id_created_at_idx 
ON messages(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_surge_message_id_idx 
ON messages(surge_message_id) WHERE surge_message_id IS NOT NULL;

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  name TEXT NULL,
  email TEXT NULL,
  opted_out BOOLEAN NOT NULL DEFAULT FALSE,
  consent_source TEXT NULL,
  consent_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, phone_e164)
);

-- Create index for contacts
CREATE INDEX IF NOT EXISTS contacts_business_id_idx ON contacts(business_id);
CREATE INDEX IF NOT EXISTS contacts_phone_e164_idx ON contacts(phone_e164);

-- Enable RLS on new tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Users can view their business messages"
ON messages FOR SELECT
USING (
  business_id IN (
    SELECT id FROM businesses WHERE id IN (
      SELECT business_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert their business messages"
ON messages FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT id FROM businesses WHERE id IN (
      SELECT business_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- RLS Policies for contacts
CREATE POLICY "Users can view their business contacts"
ON contacts FOR SELECT
USING (
  business_id IN (
    SELECT id FROM businesses WHERE id IN (
      SELECT business_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage their business contacts"
ON contacts FOR ALL
USING (
  business_id IN (
    SELECT id FROM businesses WHERE id IN (
      SELECT business_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Add updated_at trigger for contacts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
