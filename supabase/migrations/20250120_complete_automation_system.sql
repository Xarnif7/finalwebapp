-- Complete Automation System Migration
-- This migration creates all required tables and relationships for the automation system

-- 1. First, ensure we have the basic tables that might already exist
-- Add missing columns to existing customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source TEXT;

-- 2. Create automation_templates table
CREATE TABLE IF NOT EXISTS automation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'active', 'paused')),
  channels TEXT[] NOT NULL DEFAULT ARRAY['sms', 'email'],
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('event', 'date_based')),
  config_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint on business_id + key
  UNIQUE(business_id, key)
);

-- 3. Create business_integrations table
CREATE TABLE IF NOT EXISTS business_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'failed')),
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create scheduled_jobs table
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  template_id UUID,
  run_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 5. Create automation_logs table
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Add indexes for performance
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

-- 7. Enable RLS on all tables
ALTER TABLE automation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for automation_templates
CREATE POLICY "Users can view automation_templates for their business" ON automation_templates
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert automation_templates for their business" ON automation_templates
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update automation_templates for their business" ON automation_templates
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete automation_templates for their business" ON automation_templates
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

-- 9. Create RLS policies for business_integrations
CREATE POLICY "Users can view business_integrations for their business" ON business_integrations
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert business_integrations for their business" ON business_integrations
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update business_integrations for their business" ON business_integrations
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete business_integrations for their business" ON business_integrations
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

-- 10. Create RLS policies for scheduled_jobs
CREATE POLICY "Users can view scheduled_jobs for their business" ON scheduled_jobs
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert scheduled_jobs for their business" ON scheduled_jobs
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update scheduled_jobs for their business" ON scheduled_jobs
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete scheduled_jobs for their business" ON scheduled_jobs
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

-- 11. Create RLS policies for automation_logs
CREATE POLICY "Users can view automation_logs for their business" ON automation_logs
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert automation_logs for their business" ON automation_logs
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

-- 12. Create trigger functions for updated_at
CREATE OR REPLACE FUNCTION update_automation_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_business_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_scheduled_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create triggers for updated_at
CREATE TRIGGER trigger_update_automation_templates_updated_at
  BEFORE UPDATE ON automation_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_templates_updated_at();

CREATE TRIGGER trigger_update_business_integrations_updated_at
  BEFORE UPDATE ON business_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_business_integrations_updated_at();

CREATE TRIGGER trigger_update_scheduled_jobs_updated_at
  BEFORE UPDATE ON scheduled_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_jobs_updated_at();

-- 14. Add foreign key constraints
ALTER TABLE automation_templates 
ADD CONSTRAINT automation_templates_business_id_fkey 
FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE business_integrations 
ADD CONSTRAINT business_integrations_business_id_fkey 
FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE scheduled_jobs 
ADD CONSTRAINT scheduled_jobs_business_id_fkey 
FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE scheduled_jobs 
ADD CONSTRAINT scheduled_jobs_template_id_fkey 
FOREIGN KEY (template_id) REFERENCES automation_templates(id) ON DELETE CASCADE;

ALTER TABLE automation_logs 
ADD CONSTRAINT automation_logs_business_id_fkey 
FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

-- 15. Create function to auto-create default templates for new businesses
CREATE OR REPLACE FUNCTION handle_new_business()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default automation templates for the new business
  INSERT INTO automation_templates (business_id, key, name, status, channels, trigger_type, config_json)
  VALUES 
    (NEW.id, 'job_completed', 'Job Completed', 'ready', ARRAY['sms', 'email'], 'event', '{"timing": "immediate", "message": "Thank you for choosing us! How was your service?"}'),
    (NEW.id, 'invoice_paid', 'Invoice Paid', 'ready', ARRAY['sms', 'email'], 'event', '{"timing": "immediate", "message": "Thank you for your payment! We appreciate your business."}'),
    (NEW.id, 'service_reminder', 'Service Reminder', 'ready', ARRAY['sms', 'email'], 'date_based', '{"timing": "24h_after_service", "message": "How was your recent service? We''d love your feedback!"}');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 16. Create trigger to auto-create templates for new businesses
CREATE TRIGGER trigger_handle_new_business
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_business();

-- 17. Add comments
COMMENT ON TABLE automation_templates IS 'Templates for automation sequences (SMS/Email)';
COMMENT ON TABLE business_integrations IS 'Third-party integrations (Zapier, etc.)';
COMMENT ON TABLE scheduled_jobs IS 'Queue for scheduled automation jobs';
COMMENT ON TABLE automation_logs IS 'Logs for automation system events';

COMMENT ON COLUMN automation_templates.key IS 'Unique key for template type (job_completed, invoice_paid, service_reminder)';
COMMENT ON COLUMN automation_templates.channels IS 'Array of channels: sms, email';
COMMENT ON COLUMN automation_templates.trigger_type IS 'event or date_based';
COMMENT ON COLUMN automation_templates.config_json IS 'Template configuration (timing, message content, etc.)';

COMMENT ON COLUMN business_integrations.metadata_json IS 'Integration-specific data (webhook secrets, API keys, etc.)';

COMMENT ON COLUMN scheduled_jobs.payload IS 'Job-specific data (customer info, message content, etc.)';
COMMENT ON COLUMN scheduled_jobs.run_at IS 'When this job should be executed';
COMMENT ON COLUMN scheduled_jobs.status IS 'Job status: pending, processing, done, failed';
COMMENT ON COLUMN scheduled_jobs.attempts IS 'Number of processing attempts made';
COMMENT ON COLUMN scheduled_jobs.max_attempts IS 'Maximum attempts before marking as failed';
