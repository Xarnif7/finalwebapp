-- Migration: Add scheduled_jobs table for job queue system
-- This table handles queued automation jobs that need to be processed
-- Note: This migration assumes automation_templates table already exists

-- First, check if automation_templates table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automation_templates') THEN
        RAISE EXCEPTION 'automation_templates table does not exist. Please run the automation_templates migration first.';
    END IF;
END $$;

-- Create scheduled_jobs table
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES automation_templates(id) ON DELETE CASCADE,
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_business_id ON scheduled_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_template_id ON scheduled_jobs(template_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_run_at ON scheduled_jobs(run_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_pending ON scheduled_jobs(run_at, status) WHERE status = 'pending';

-- Create composite index for worker queries
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_worker ON scheduled_jobs(status, run_at) WHERE status = 'pending';

-- Add RLS policies
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see jobs for their business
CREATE POLICY "Users can view scheduled_jobs for their business" ON scheduled_jobs
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

-- Policy: Users can insert jobs for their business
CREATE POLICY "Users can insert scheduled_jobs for their business" ON scheduled_jobs
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

-- Policy: Users can update jobs for their business
CREATE POLICY "Users can update scheduled_jobs for their business" ON scheduled_jobs
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

-- Policy: Users can delete jobs for their business
CREATE POLICY "Users can delete scheduled_jobs for their business" ON scheduled_jobs
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM businesses WHERE created_by = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_scheduled_jobs_updated_at
  BEFORE UPDATE ON scheduled_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_jobs_updated_at();

-- Add comment
COMMENT ON TABLE scheduled_jobs IS 'Queue for scheduled automation jobs (SMS/Email sends)';
COMMENT ON COLUMN scheduled_jobs.payload IS 'Job-specific data (customer info, message content, etc.)';
COMMENT ON COLUMN scheduled_jobs.run_at IS 'When this job should be executed';
COMMENT ON COLUMN scheduled_jobs.status IS 'Job status: pending, processing, done, failed';
COMMENT ON COLUMN scheduled_jobs.attempts IS 'Number of processing attempts made';
COMMENT ON COLUMN scheduled_jobs.max_attempts IS 'Maximum attempts before marking as failed';
