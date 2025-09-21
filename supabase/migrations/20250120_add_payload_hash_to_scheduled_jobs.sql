-- Add payload_hash column to scheduled_jobs for deduplication
ALTER TABLE scheduled_jobs 
ADD COLUMN IF NOT EXISTS payload_hash TEXT;

-- Create unique constraint for deduplication
-- This prevents duplicate jobs with same template_id, run_at, and payload_hash
CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_jobs_deduplication 
ON scheduled_jobs(template_id, run_at, payload_hash) 
WHERE payload_hash IS NOT NULL;

-- Create index on payload_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_payload_hash 
ON scheduled_jobs(payload_hash);

-- Add comment explaining the deduplication logic
COMMENT ON COLUMN scheduled_jobs.payload_hash IS 'SHA-256 hash of payload JSON for deduplication';
COMMENT ON INDEX idx_scheduled_jobs_deduplication IS 'Prevents duplicate jobs with same template, run time, and payload';
