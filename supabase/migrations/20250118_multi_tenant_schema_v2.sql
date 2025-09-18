-- Multi-tenant schema migration v2
-- This migration sets up proper multi-tenancy with business_id isolation
-- and Row Level Security (RLS) policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create businesses table (if it doesn't exist)
-- Note: We're not inserting any data here to avoid constraint issues
CREATE TABLE IF NOT EXISTS businesses (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 2. Create profiles table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS profiles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    role text CHECK (role IN ('owner', 'admin', 'staff')) DEFAULT 'owner',
    created_at timestamptz DEFAULT now()
);

-- 3. Create tenant tables if they don't exist
CREATE TABLE IF NOT EXISTS customers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id text,
    first_name text,
    last_name text,
    email text,
    phone text,
    tags text[],
    source text DEFAULT 'manual',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
    platform text NOT NULL,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    content text,
    review_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_email text,
    customer_phone text,
    customer_name text,
    subject text,
    content text,
    type text DEFAULT 'review_request',
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_drafts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
    content text NOT NULL,
    type text DEFAULT 'review_request',
    status text DEFAULT 'draft',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sequences (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
    sequence_id uuid REFERENCES sequences(id) ON DELETE CASCADE,
    scheduled_for timestamptz NOT NULL,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS csv_imports (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename text NOT NULL,
    status text DEFAULT 'pending',
    total_rows integer DEFAULT 0,
    processed_rows integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS competitors (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    platform text NOT NULL,
    url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    type text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    actor text NOT NULL,
    action text NOT NULL,
    payload_hash text,
    created_at timestamptz DEFAULT now()
);

-- 4. Add business_id columns to all tenant tables
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

-- 5. Add created_at/updated_at columns if they don't exist
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE ai_drafts ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE ai_drafts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE csv_imports ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE csv_imports ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 6. Create a default business and backfill ALL existing data
DO $$
DECLARE
    first_business_id uuid;
    business_count integer;
    default_business_id uuid := '00000000-0000-0000-0000-000000000001';
    invalid_business_ids uuid[];
BEGIN
    -- Check if businesses table has any data
    SELECT COUNT(*) INTO business_count FROM businesses;
    
    IF business_count = 0 THEN
        -- Create a default business for existing data
        INSERT INTO businesses (id, name, created_at) 
        VALUES (default_business_id, 'Default Business', now())
        ON CONFLICT (id) DO NOTHING;
        
        first_business_id := default_business_id;
        RAISE NOTICE 'Created default business with ID: %', first_business_id;
    ELSE
        -- Get the first business ID
        SELECT id INTO first_business_id FROM businesses LIMIT 1;
        RAISE NOTICE 'Using existing business with ID: %', first_business_id;
    END IF;
    
    -- Find all invalid business_ids (those that don't exist in businesses table)
    SELECT ARRAY_AGG(DISTINCT business_id) INTO invalid_business_ids
    FROM (
        SELECT business_id FROM customers WHERE business_id IS NOT NULL
        UNION
        SELECT business_id FROM reviews WHERE business_id IS NOT NULL
        UNION
        SELECT business_id FROM messages WHERE business_id IS NOT NULL
        UNION
        SELECT business_id FROM ai_drafts WHERE business_id IS NOT NULL
        UNION
        SELECT business_id FROM sequences WHERE business_id IS NOT NULL
        UNION
        SELECT business_id FROM scheduled_jobs WHERE business_id IS NOT NULL
        UNION
        SELECT business_id FROM csv_imports WHERE business_id IS NOT NULL
        UNION
        SELECT business_id FROM competitors WHERE business_id IS NOT NULL
        UNION
        SELECT business_id FROM alerts WHERE business_id IS NOT NULL
        UNION
        SELECT business_id FROM audit_log WHERE business_id IS NOT NULL
    ) AS all_business_ids
    WHERE business_id NOT IN (SELECT id FROM businesses);
    
    -- Update ALL existing data to use the valid business_id
    UPDATE customers SET business_id = first_business_id WHERE business_id IS NULL OR business_id = ANY(invalid_business_ids);
    UPDATE reviews SET business_id = first_business_id WHERE business_id IS NULL OR business_id = ANY(invalid_business_ids);
    UPDATE messages SET business_id = first_business_id WHERE business_id IS NULL OR business_id = ANY(invalid_business_ids);
    UPDATE ai_drafts SET business_id = first_business_id WHERE business_id IS NULL OR business_id = ANY(invalid_business_ids);
    UPDATE sequences SET business_id = first_business_id WHERE business_id IS NULL OR business_id = ANY(invalid_business_ids);
    UPDATE scheduled_jobs SET business_id = first_business_id WHERE business_id IS NULL OR business_id = ANY(invalid_business_ids);
    UPDATE csv_imports SET business_id = first_business_id WHERE business_id IS NULL OR business_id = ANY(invalid_business_ids);
    UPDATE competitors SET business_id = first_business_id WHERE business_id IS NULL OR business_id = ANY(invalid_business_ids);
    UPDATE alerts SET business_id = first_business_id WHERE business_id IS NULL OR business_id = ANY(invalid_business_ids);
    UPDATE audit_log SET business_id = first_business_id WHERE business_id IS NULL OR business_id = ANY(invalid_business_ids);
    
    RAISE NOTICE 'Backfilled existing data with business_id: %', first_business_id;
    IF invalid_business_ids IS NOT NULL AND array_length(invalid_business_ids, 1) > 0 THEN
        RAISE NOTICE 'Fixed invalid business_ids: %', invalid_business_ids;
    END IF;
END $$;

-- 7. Set NOT NULL constraints and foreign keys after backfill
-- We're guaranteed to have a business at this point
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

-- Add foreign key constraints
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

-- 8. Enable RLS on all tenant tables
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

-- 9. Create RLS policies for data isolation
-- These policies ensure users can only access data from their business

-- Customers policies
CREATE POLICY "Users can view customers from their business" ON customers
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert customers to their business" ON customers
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update customers from their business" ON customers
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete customers from their business" ON customers
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Reviews policies
CREATE POLICY "Users can view reviews from their business" ON reviews
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert reviews to their business" ON reviews
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update reviews from their business" ON reviews
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete reviews from their business" ON reviews
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Messages policies
CREATE POLICY "Users can view messages from their business" ON messages
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages to their business" ON messages
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update messages from their business" ON messages
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete messages from their business" ON messages
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- AI Drafts policies
CREATE POLICY "Users can view ai_drafts from their business" ON ai_drafts
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert ai_drafts to their business" ON ai_drafts
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update ai_drafts from their business" ON ai_drafts
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete ai_drafts from their business" ON ai_drafts
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Sequences policies
CREATE POLICY "Users can view sequences from their business" ON sequences
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert sequences to their business" ON sequences
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update sequences from their business" ON sequences
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete sequences from their business" ON sequences
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Scheduled Jobs policies
CREATE POLICY "Users can view scheduled_jobs from their business" ON scheduled_jobs
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert scheduled_jobs to their business" ON scheduled_jobs
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update scheduled_jobs from their business" ON scheduled_jobs
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete scheduled_jobs from their business" ON scheduled_jobs
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- CSV Imports policies
CREATE POLICY "Users can view csv_imports from their business" ON csv_imports
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert csv_imports to their business" ON csv_imports
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update csv_imports from their business" ON csv_imports
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete csv_imports from their business" ON csv_imports
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Competitors policies
CREATE POLICY "Users can view competitors from their business" ON competitors
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert competitors to their business" ON competitors
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update competitors from their business" ON competitors
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete competitors from their business" ON competitors
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Alerts policies
CREATE POLICY "Users can view alerts from their business" ON alerts
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert alerts to their business" ON alerts
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update alerts from their business" ON alerts
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete alerts from their business" ON alerts
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Audit Log policies
CREATE POLICY "Users can view audit_log from their business" ON audit_log
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert audit_log to their business" ON audit_log
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_messages_business_id ON messages(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_business_id ON ai_drafts(business_id);
CREATE INDEX IF NOT EXISTS idx_sequences_business_id ON sequences(business_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_business_id ON scheduled_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_csv_imports_business_id ON csv_imports(business_id);
CREATE INDEX IF NOT EXISTS idx_competitors_business_id ON competitors(business_id);
CREATE INDEX IF NOT EXISTS idx_alerts_business_id ON alerts(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_business_id ON audit_log(business_id);

-- 11. Create indexes for profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_business_id ON profiles(business_id);

-- Migration completed successfully
SELECT 'Multi-tenant schema migration completed successfully' as status;
