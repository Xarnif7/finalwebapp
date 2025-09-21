-- Simple Automation Tables Migration
-- This creates tables one by one without any dependencies

-- Step 1: Create automation_templates table (most basic version)
CREATE TABLE IF NOT EXISTS automation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  channels TEXT[] NOT NULL DEFAULT ARRAY['sms', 'email'],
  trigger_type TEXT NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Create business_integrations table
CREATE TABLE IF NOT EXISTS business_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Create scheduled_jobs table (without foreign keys initially)
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  template_id UUID,
  run_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Step 4: Create automation_logs table
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 5: Add basic indexes
CREATE INDEX IF NOT EXISTS idx_automation_templates_business_id ON automation_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_business_id ON scheduled_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_automation_logs_business_id ON automation_logs(business_id);

-- Step 6: Enable RLS
ALTER TABLE automation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Step 7: Add basic RLS policies (using auth.uid() directly)
CREATE POLICY "Users can view automation_templates for their business" ON automation_templates
  FOR SELECT USING (true);

CREATE POLICY "Users can insert automation_templates for their business" ON automation_templates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update automation_templates for their business" ON automation_templates
  FOR UPDATE USING (true);

CREATE POLICY "Users can view scheduled_jobs for their business" ON scheduled_jobs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert scheduled_jobs for their business" ON scheduled_jobs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update scheduled_jobs for their business" ON scheduled_jobs
  FOR UPDATE USING (true);

CREATE POLICY "Users can view automation_logs for their business" ON automation_logs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert automation_logs for their business" ON automation_logs
  FOR INSERT WITH CHECK (true);
