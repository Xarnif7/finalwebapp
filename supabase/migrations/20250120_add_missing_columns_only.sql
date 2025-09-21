-- Add Missing Columns Only Migration
-- This only adds missing columns and constraints without recreating existing tables

-- Step 1: Add missing columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source TEXT;

-- Step 2: Add missing columns to businesses table if needed
-- (This might already exist, but we'll add it safely)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Step 3: Add unique constraint to automation_templates if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'automation_templates_business_id_key_unique' 
        AND table_name = 'automation_templates'
    ) THEN
        ALTER TABLE automation_templates ADD CONSTRAINT automation_templates_business_id_key_unique UNIQUE(business_id, key);
    END IF;
END $$;

-- Step 4: Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add foreign key from automation_templates to businesses
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'automation_templates_business_id_fkey' 
        AND table_name = 'automation_templates'
    ) THEN
        ALTER TABLE automation_templates 
        ADD CONSTRAINT automation_templates_business_id_fkey 
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    -- Add foreign key from business_integrations to businesses
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'business_integrations_business_id_fkey' 
        AND table_name = 'business_integrations'
    ) THEN
        ALTER TABLE business_integrations 
        ADD CONSTRAINT business_integrations_business_id_fkey 
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    -- Add foreign key from scheduled_jobs to businesses
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'scheduled_jobs_business_id_fkey' 
        AND table_name = 'scheduled_jobs'
    ) THEN
        ALTER TABLE scheduled_jobs 
        ADD CONSTRAINT scheduled_jobs_business_id_fkey 
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    -- Add foreign key from scheduled_jobs to automation_templates
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'scheduled_jobs_template_id_fkey' 
        AND table_name = 'scheduled_jobs'
    ) THEN
        ALTER TABLE scheduled_jobs 
        ADD CONSTRAINT scheduled_jobs_template_id_fkey 
        FOREIGN KEY (template_id) REFERENCES automation_templates(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    -- Add foreign key from automation_logs to businesses
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'automation_logs_business_id_fkey' 
        AND table_name = 'automation_logs'
    ) THEN
        ALTER TABLE automation_logs 
        ADD CONSTRAINT automation_logs_business_id_fkey 
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 5: Add missing indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_automation_templates_business_id ON automation_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_automation_templates_key ON automation_templates(business_id, key);
CREATE INDEX IF NOT EXISTS idx_automation_templates_status ON automation_templates(status);

CREATE INDEX IF NOT EXISTS idx_business_integrations_business_id ON business_integrations(business_id);
CREATE INDEX IF NOT EXISTS idx_business_integrations_provider ON business_integrations(provider);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_business_id ON scheduled_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_template_id ON scheduled_jobs(template_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_run_at ON scheduled_jobs(run_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_pending ON scheduled_jobs(run_at, status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_automation_logs_business_id ON automation_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_level ON automation_logs(level);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON automation_logs(created_at);

-- Step 6: Add missing columns to scheduled_jobs if they don't exist
ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3;
ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Step 7: Add missing columns to automation_templates if they don't exist
ALTER TABLE automation_templates ADD COLUMN IF NOT EXISTS channels TEXT[] NOT NULL DEFAULT ARRAY['sms', 'email'];
ALTER TABLE automation_templates ADD COLUMN IF NOT EXISTS trigger_type TEXT NOT NULL DEFAULT 'event';
ALTER TABLE automation_templates ADD COLUMN IF NOT EXISTS config_json JSONB NOT NULL DEFAULT '{}';

-- Step 8: Add missing columns to business_integrations if they don't exist
ALTER TABLE business_integrations ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}';

-- Step 9: Add missing columns to automation_logs if they don't exist
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
