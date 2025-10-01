-- Surge Subaccount Support Migration
-- Adds required columns for Surge SMS integration with subaccount support

-- Add Surge-related columns to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS surge_account_id text,
ADD COLUMN IF NOT EXISTS surge_phone_id text,
ADD COLUMN IF NOT EXISTS from_number text,
ADD COLUMN IF NOT EXISTS sender_type text DEFAULT 'tfn',
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_verification_error text,
ADD COLUMN IF NOT EXISTS tfn_verification_id text;

-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
    direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    channel text NOT NULL DEFAULT 'sms',
    body text NOT NULL,
    status text NOT NULL DEFAULT 'queued',
    surge_message_id text UNIQUE,
    error text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create contacts table if it doesn't exist
CREATE TABLE IF NOT EXISTS contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    phone_e164 text NOT NULL,
    name text,
    email text,
    opted_out boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(business_id, phone_e164)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_business_id ON messages(business_id);
CREATE INDEX IF NOT EXISTS idx_messages_surge_message_id ON messages(surge_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
CREATE INDEX IF NOT EXISTS idx_contacts_business_id ON contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_e164 ON contacts(phone_e164);
CREATE INDEX IF NOT EXISTS idx_businesses_surge_account_id ON businesses(surge_account_id);
CREATE INDEX IF NOT EXISTS idx_businesses_from_number ON businesses(from_number);

-- Enable RLS on new tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for messages
CREATE POLICY "Users can view own business messages" ON messages
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can insert own business messages" ON messages
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can update own business messages" ON messages
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'
        )
    );

-- RLS policies for contacts
CREATE POLICY "Users can view own business contacts" ON contacts
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can insert own business contacts" ON contacts
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can update own business contacts" ON contacts
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'
        )
    );

-- Grant permissions
GRANT ALL ON messages TO anon, authenticated;
GRANT ALL ON contacts TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
