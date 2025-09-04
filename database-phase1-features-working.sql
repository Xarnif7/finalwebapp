-- Phase 1 Features Database Migration - WORKING VERSION
-- Extends existing Blipp app with new tables and columns
-- This works with your existing database structure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Techs Table (create this first)
CREATE TABLE IF NOT EXISTS techs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT NULL,
    phone TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Review Requests Table (extend existing or create new)
CREATE TABLE IF NOT EXISTS review_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
    strategy TEXT NOT NULL DEFAULT 'immediate' CHECK (strategy IN ('immediate', 'magic')),
    best_send_at TIMESTAMP WITH TIME ZONE NULL,
    sent_at TIMESTAMP WITH TIME ZONE NULL,
    delivered_at TIMESTAMP WITH TIME ZONE NULL,
    opened_at TIMESTAMP WITH TIME ZONE NULL,
    clicked_at TIMESTAMP WITH TIME ZONE NULL,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sent', 'opened', 'clicked', 'completed', 'expired')),
    tech_id UUID NULL REFERENCES techs(id) ON DELETE SET NULL,
    job_type TEXT NULL,
    job_end_at TIMESTAMP WITH TIME ZONE NULL,
    review_link TEXT NULL,
    message TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Private Feedback Table
CREATE TABLE IF NOT EXISTS private_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    review_request_id UUID NOT NULL REFERENCES review_requests(id) ON DELETE CASCADE,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE NULL
);

-- 4. QR Codes Table
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    tech_id UUID NULL REFERENCES techs(id) ON DELETE SET NULL,
    code TEXT UNIQUE NOT NULL,
    url TEXT NOT NULL,
    scans_count INTEGER DEFAULT 0,
    last_scanned_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Social Posts Table
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    review_id UUID NULL, -- Will reference reviews table when it exists
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'download')),
    content JSONB NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Scheduled Jobs Table
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    run_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. KPI Alerts Table
CREATE TABLE IF NOT EXISTS kpi_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    rule TEXT NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE NULL
);

-- 8. Telemetry Events Table
CREATE TABLE IF NOT EXISTS telemetry_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_review_requests_business_send_time ON review_requests(business_id, best_send_at);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON review_requests(status);
CREATE INDEX IF NOT EXISTS idx_review_requests_customer ON review_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_tech ON review_requests(tech_id);

CREATE INDEX IF NOT EXISTS idx_private_feedback_review_request ON private_feedback(review_request_id);
CREATE INDEX IF NOT EXISTS idx_private_feedback_sentiment ON private_feedback(sentiment);
CREATE INDEX IF NOT EXISTS idx_private_feedback_resolved ON private_feedback(resolved_at);

CREATE INDEX IF NOT EXISTS idx_qr_codes_business ON qr_codes(business_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_tech ON qr_codes(tech_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(code);

CREATE INDEX IF NOT EXISTS idx_social_posts_business ON social_posts(business_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_review ON social_posts(review_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_run_at ON scheduled_jobs(run_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_type ON scheduled_jobs(job_type);

CREATE INDEX IF NOT EXISTS idx_kpi_alerts_business ON kpi_alerts(business_id);
CREATE INDEX IF NOT EXISTS idx_kpi_alerts_triggered ON kpi_alerts(triggered_at);
CREATE INDEX IF NOT EXISTS idx_kpi_alerts_acknowledged ON kpi_alerts(acknowledged);

CREATE INDEX IF NOT EXISTS idx_techs_business ON techs(business_id);
CREATE INDEX IF NOT EXISTS idx_techs_active ON techs(is_active);

CREATE INDEX IF NOT EXISTS idx_telemetry_business ON telemetry_events(business_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_created ON telemetry_events(created_at);

-- Row Level Security (RLS) Policies
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE techs ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_requests (using your existing pattern)
CREATE POLICY "Users can view own business review requests" ON review_requests
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.email()
        )
    );

CREATE POLICY "Users can insert own business review requests" ON review_requests
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.email()
        )
    );

CREATE POLICY "Users can update own business review requests" ON review_requests
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.email()
        )
    );

-- RLS Policies for private_feedback
CREATE POLICY "Users can view own business private feedback" ON private_feedback
    FOR SELECT USING (
        review_request_id IN (
            SELECT id FROM review_requests WHERE business_id IN (
                SELECT id FROM businesses WHERE created_by = auth.email()
            )
        )
    );

CREATE POLICY "Users can insert private feedback" ON private_feedback
    FOR INSERT WITH CHECK (true); -- Allow public feedback creation

CREATE POLICY "Users can update own business private feedback" ON private_feedback
    FOR UPDATE USING (
        review_request_id IN (
            SELECT id FROM review_requests WHERE business_id IN (
                SELECT id FROM businesses WHERE created_by = auth.email()
            )
        )
    );

-- RLS Policies for qr_codes
CREATE POLICY "Users can view own business QR codes" ON qr_codes
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.email()
        )
    );

CREATE POLICY "Users can insert own business QR codes" ON qr_codes
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.email()
        )
    );

CREATE POLICY "Users can update own business QR codes" ON qr_codes
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.email()
        )
    );

-- RLS Policies for social_posts
CREATE POLICY "Users can view own business social posts" ON social_posts
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.email()
        )
    );

CREATE POLICY "Users can insert own business social posts" ON social_posts
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.email()
        )
    );

CREATE POLICY "Users can update own business social posts" ON social_posts
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.email()
        )
    );

-- RLS Policies for scheduled_jobs (admin only)
CREATE POLICY "Users can view own business scheduled jobs" ON scheduled_jobs
    FOR SELECT USING (
        payload->>'business_id' IN (
            SELECT id::text FROM businesses WHERE created_by = auth.email()
        )
    );

-- RLS Policies for kpi_alerts
CREATE POLICY "Users can view own business KPI alerts" ON kpi_alerts
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.email()
        )
    );

CREATE POLICY "Users can update own business KPI alerts" ON kpi_alerts
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.email()
        )
    );

-- RLS Policies for techs
CREATE POLICY "Users can view own business techs" ON techs
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.email()
        )
    );

CREATE POLICY "Users can insert own business techs" ON techs
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.email()
        )
    );

CREATE POLICY "Users can update own business techs" ON techs
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.email()
        )
    );

-- RLS Policies for telemetry_events
CREATE POLICY "Users can view own business telemetry" ON telemetry_events
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.email()
        )
    );

CREATE POLICY "System can insert telemetry" ON telemetry_events
    FOR INSERT WITH CHECK (true); -- Allow system to log events

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_review_requests_updated_at BEFORE UPDATE ON review_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON social_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_jobs_updated_at BEFORE UPDATE ON scheduled_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_techs_updated_at BEFORE UPDATE ON techs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to log telemetry events
CREATE OR REPLACE FUNCTION log_telemetry_event(
    p_business_id UUID,
    p_event_type TEXT,
    p_event_data JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO telemetry_events (business_id, event_type, event_data)
    VALUES (p_business_id, p_event_type, p_event_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate unique QR codes
CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 8-character code
        code := substring(md5(random()::text) from 1 for 8);
        
        -- Check if it already exists
        SELECT EXISTS(SELECT 1 FROM qr_codes WHERE qr_codes.code = generate_qr_code.code) INTO exists;
        
        -- If it doesn't exist, we can use it
        IF NOT exists THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
