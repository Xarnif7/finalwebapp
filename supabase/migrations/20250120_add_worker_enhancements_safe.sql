-- Safe migration for worker enhancements - handles existing policies gracefully

-- Add worker enhancement columns to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT '20:00',
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS daily_cap INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Add consent tracking to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_consent BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS opted_out BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ;

-- Add rate limiting columns to automation_templates
ALTER TABLE automation_templates 
ADD COLUMN IF NOT EXISTS rate_per_hour INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS rate_per_day INTEGER DEFAULT 500;

-- Add worker lock table for preventing concurrent runs
CREATE TABLE IF NOT EXISTS worker_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id TEXT NOT NULL,
    locked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes') NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for lock cleanup
CREATE INDEX IF NOT EXISTS idx_worker_locks_expires_at ON worker_locks(expires_at);

-- Enable RLS on worker_locks
ALTER TABLE worker_locks ENABLE ROW LEVEL SECURITY;

-- RLS policies for worker_locks (service role only) - only create if not exists
DO $$ 
BEGIN
    -- Check if policy exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'worker_locks' 
        AND policyname = 'Service role can manage worker locks'
    ) THEN
        CREATE POLICY "Service role can manage worker locks"
        ON worker_locks FOR ALL
        TO service_role
        USING (true);
    END IF;
END $$;
