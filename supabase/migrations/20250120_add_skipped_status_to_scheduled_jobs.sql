-- Add 'skipped' status to scheduled_jobs status enum
-- First, add the new value to the existing enum
ALTER TYPE scheduled_jobs_status ADD VALUE IF NOT EXISTS 'skipped';

-- Add comment explaining the skipped status
COMMENT ON COLUMN scheduled_jobs.status IS 'Job status: pending, processing, done, failed, skipped (paused templates)';
