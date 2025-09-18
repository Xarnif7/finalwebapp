-- Multi-tenant schema migration
-- This migration adds business_id to all tenant tables and sets up RLS policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create businesses table (if it doesn't exist)
-- Note: If businesses table already exists with different schema, we'll alter it instead
DO $$ 
BEGIN
    -- Check if businesses table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'businesses') THEN
        CREATE TABLE businesses (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            name text NOT NULL,
            created_at timestamptz DEFAULT now()
        );
    END IF;
END $$;

-- 2. Create profiles table (user to business mapping)
CREATE TABLE IF NOT EXISTS profiles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    role text CHECK (role IN ('owner', 'admin', 'staff')) DEFAULT 'owner',
    created_at timestamptz DEFAULT now()
);

-- 3. Create tenant tables if they don't exist, then add business_id and timestamps
-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id text,
    first_name text,
    last_name text,
    full_name text,
    email text,
    phone text,
    service_date date,
    notes text,
    tags text[],
    source text DEFAULT 'manual',
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id uuid,
    platform text,
    rating integer,
    content text,
    url text,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id uuid,
    customer_email text,
    customer_phone text,
    customer_name text,
    subject text,
    content text,
    type text DEFAULT 'email',
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- AI drafts table
CREATE TABLE IF NOT EXISTS ai_drafts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id uuid,
    content text,
    type text DEFAULT 'review_response',
    status text DEFAULT 'draft',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Sequences table
CREATE TABLE IF NOT EXISTS sequences (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    steps jsonb,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Scheduled jobs table
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id uuid,
    job_type text,
    scheduled_for timestamptz,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- CSV imports table
CREATE TABLE IF NOT EXISTS csv_imports (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename text,
    status text DEFAULT 'pending',
    imported_count integer DEFAULT 0,
    error_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Competitors table
CREATE TABLE IF NOT EXISTS competitors (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    platform text,
    url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    type text NOT NULL,
    message text,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor text NOT NULL,
    action text NOT NULL,
    payload_hash text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Now add business_id columns to existing tables
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE ai_drafts ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE csv_imports ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS business_id uuid;

-- 4. Backfill existing data with placeholder business
-- Create a default business for existing data
-- Use a placeholder UUID for created_by since it's required
INSERT INTO businesses (id, name, created_by) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Legacy Data Business', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;

-- Backfill existing rows with the default business_id
UPDATE customers SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE reviews SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE messages SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE ai_drafts SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE sequences SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE scheduled_jobs SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE csv_imports SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE competitors SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE alerts SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE audit_log SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;

-- 5. Set NOT NULL constraints after backfill
ALTER TABLE customers ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE reviews ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE messages ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE ai_drafts ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE sequences ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE scheduled_jobs ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE csv_imports ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE competitors ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE alerts ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE audit_log ALTER COLUMN business_id SET NOT NULL;

-- 6. Add foreign key constraints
ALTER TABLE customers ADD CONSTRAINT fk_customers_business_id FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD CONSTRAINT fk_reviews_business_id FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE messages ADD CONSTRAINT fk_messages_business_id FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE ai_drafts ADD CONSTRAINT fk_ai_drafts_business_id FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE sequences ADD CONSTRAINT fk_sequences_business_id FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE scheduled_jobs ADD CONSTRAINT fk_scheduled_jobs_business_id FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE csv_imports ADD CONSTRAINT fk_csv_imports_business_id FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE competitors ADD CONSTRAINT fk_competitors_business_id FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE alerts ADD CONSTRAINT fk_alerts_business_id FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE audit_log ADD CONSTRAINT fk_audit_log_business_id FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

-- 7. Create helpful indexes
CREATE INDEX IF NOT EXISTS idx_customers_business_email ON customers(business_id, email);
CREATE INDEX IF NOT EXISTS idx_customers_business_phone ON customers(business_id, phone);
CREATE INDEX IF NOT EXISTS idx_reviews_business_created ON reviews(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_business_created ON messages(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sequences_business ON sequences(business_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_business_created ON scheduled_jobs(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_csv_imports_business_created ON csv_imports(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_competitors_business ON competitors(business_id);
CREATE INDEX IF NOT EXISTS idx_alerts_business ON alerts(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_business_created ON audit_log(business_id, created_at DESC);

-- 8. Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for each tenant table
-- Customers policies
CREATE POLICY "tenant_select" ON customers FOR SELECT USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_insert" ON customers FOR INSERT WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_update" ON customers FOR UPDATE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_delete" ON customers FOR DELETE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));

-- Reviews policies
CREATE POLICY "tenant_select" ON reviews FOR SELECT USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_insert" ON reviews FOR INSERT WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_update" ON reviews FOR UPDATE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_delete" ON reviews FOR DELETE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));

-- Messages policies
CREATE POLICY "tenant_select" ON messages FOR SELECT USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_insert" ON messages FOR INSERT WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_update" ON messages FOR UPDATE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_delete" ON messages FOR DELETE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));

-- AI drafts policies
CREATE POLICY "tenant_select" ON ai_drafts FOR SELECT USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_insert" ON ai_drafts FOR INSERT WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_update" ON ai_drafts FOR UPDATE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_delete" ON ai_drafts FOR DELETE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));

-- Sequences policies
CREATE POLICY "tenant_select" ON sequences FOR SELECT USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_insert" ON sequences FOR INSERT WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_update" ON sequences FOR UPDATE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_delete" ON sequences FOR DELETE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));

-- Scheduled jobs policies
CREATE POLICY "tenant_select" ON scheduled_jobs FOR SELECT USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_insert" ON scheduled_jobs FOR INSERT WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_update" ON scheduled_jobs FOR UPDATE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_delete" ON scheduled_jobs FOR DELETE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));

-- CSV imports policies
CREATE POLICY "tenant_select" ON csv_imports FOR SELECT USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_insert" ON csv_imports FOR INSERT WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_update" ON csv_imports FOR UPDATE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_delete" ON csv_imports FOR DELETE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));

-- Competitors policies
CREATE POLICY "tenant_select" ON competitors FOR SELECT USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_insert" ON competitors FOR INSERT WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_update" ON competitors FOR UPDATE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_delete" ON competitors FOR DELETE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));

-- Alerts policies
CREATE POLICY "tenant_select" ON alerts FOR SELECT USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_insert" ON alerts FOR INSERT WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_update" ON alerts FOR UPDATE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_delete" ON alerts FOR DELETE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));

-- Audit log policies
CREATE POLICY "tenant_select" ON audit_log FOR SELECT USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_insert" ON audit_log FOR INSERT WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_update" ON audit_log FOR UPDATE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "tenant_delete" ON audit_log FOR DELETE USING (business_id = (SELECT business_id FROM profiles WHERE user_id = auth.uid()));

-- 10. Create seed data for existing test user
-- Insert a demo business
INSERT INTO businesses (id, name) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Demo Business')
ON CONFLICT (id) DO NOTHING;

-- Map existing test user to demo business (replace with actual user_id)
-- This will be updated when we know the actual test user ID
-- INSERT INTO profiles (user_id, business_id, role) 
-- VALUES ('3671eeff-f8db-4cae-b545-7512ad1af66c', '11111111-1111-1111-1111-111111111111', 'owner')
-- ON CONFLICT (user_id) DO UPDATE SET business_id = EXCLUDED.business_id;

COMMENT ON TABLE businesses IS 'Multi-tenant business entities';
COMMENT ON TABLE profiles IS 'User to business mapping with roles';
COMMENT ON COLUMN customers.business_id IS 'Multi-tenant isolation - each business sees only their customers';
COMMENT ON COLUMN reviews.business_id IS 'Multi-tenant isolation - each business sees only their reviews';
COMMENT ON COLUMN messages.business_id IS 'Multi-tenant isolation - each business sees only their messages';
COMMENT ON COLUMN ai_drafts.business_id IS 'Multi-tenant isolation - each business sees only their AI drafts';
COMMENT ON COLUMN sequences.business_id IS 'Multi-tenant isolation - each business sees only their sequences';
COMMENT ON COLUMN scheduled_jobs.business_id IS 'Multi-tenant isolation - each business sees only their scheduled jobs';
COMMENT ON COLUMN csv_imports.business_id IS 'Multi-tenant isolation - each business sees only their CSV imports';
COMMENT ON COLUMN competitors.business_id IS 'Multi-tenant isolation - each business sees only their competitors';
COMMENT ON COLUMN alerts.business_id IS 'Multi-tenant isolation - each business sees only their alerts';
COMMENT ON COLUMN audit_log.business_id IS 'Multi-tenant isolation - each business sees only their audit logs';
