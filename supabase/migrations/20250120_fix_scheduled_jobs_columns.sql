-- Fix scheduled_jobs table - Add missing columns first, then constraints

-- Step 1: Add missing columns to scheduled_jobs table
ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS run_at TIMESTAMPTZ;
ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}';
ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3;
ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Step 2: Add missing columns to automation_templates table
ALTER TABLE automation_templates ADD COLUMN IF NOT EXISTS channels TEXT[] DEFAULT ARRAY['sms', 'email'];
ALTER TABLE automation_templates ADD COLUMN IF NOT EXISTS trigger_type TEXT DEFAULT 'event';
ALTER TABLE automation_templates ADD COLUMN IF NOT EXISTS config_json JSONB DEFAULT '{}';

-- Step 3: Add missing columns to business_integrations table
ALTER TABLE business_integrations ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}';

-- Step 4: Add missing columns to automation_logs table
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Step 5: Add missing columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source TEXT;

-- Step 6: Now add foreign key constraints (after columns exist)
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

-- Step 7: Add indexes for performance
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
