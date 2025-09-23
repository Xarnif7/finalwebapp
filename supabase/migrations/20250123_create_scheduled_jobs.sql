-- Create scheduled_jobs table for automation email scheduling
CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    run_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON public.scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_run_at ON public.scheduled_jobs(run_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_job_type ON public.scheduled_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_run_at ON public.scheduled_jobs(status, run_at);

-- Enable RLS
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their business scheduled jobs" ON public.scheduled_jobs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = (payload->>'business_id')::uuid
            AND b.created_by = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Service role can manage all scheduled jobs" ON public.scheduled_jobs
    FOR ALL USING (auth.role() = 'service_role');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scheduled_jobs_updated_at 
    BEFORE UPDATE ON public.scheduled_jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();
