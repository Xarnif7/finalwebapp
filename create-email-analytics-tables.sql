-- Email Analytics and Tracking Tables
-- This script creates tables to track email performance and customer engagement

-- Email tracking table
CREATE TABLE IF NOT EXISTS email_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email_id TEXT NOT NULL, -- Resend email ID
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    review_request_id UUID REFERENCES review_requests(id) ON DELETE SET NULL,
    email_type TEXT NOT NULL, -- 'review_request', 'follow_up', 'automation'
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    opened_at TIMESTAMPTZ NULL,
    clicked_at TIMESTAMPTZ NULL,
    replied_at TIMESTAMPTZ NULL,
    bounced_at TIMESTAMPTZ NULL,
    unsubscribed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email click tracking table
CREATE TABLE IF NOT EXISTS email_clicks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email_tracking_id UUID NOT NULL REFERENCES email_tracking(id) ON DELETE CASCADE,
    link_url TEXT NOT NULL,
    clicked_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    location_data JSONB -- Store geographic data if available
);

-- Email open tracking table
CREATE TABLE IF NOT EXISTS email_opens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email_tracking_id UUID NOT NULL REFERENCES email_tracking(id) ON DELETE CASCADE,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    location_data JSONB,
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
    email_client TEXT -- 'gmail', 'outlook', etc.
);

-- Email replies tracking table
CREATE TABLE IF NOT EXISTS email_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email_tracking_id UUID NOT NULL REFERENCES email_tracking(id) ON DELETE CASCADE,
    reply_content TEXT,
    reply_sentiment TEXT, -- 'positive', 'negative', 'neutral'
    replied_at TIMESTAMPTZ DEFAULT NOW(),
    sender_email TEXT NOT NULL
);

-- Analytics summary table for fast reporting
CREATE TABLE IF NOT EXISTS email_analytics_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    email_type TEXT NOT NULL,
    total_sent INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_replied INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    total_unsubscribed INTEGER DEFAULT 0,
    avg_response_time_hours DECIMAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, date, email_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_tracking_business_id ON email_tracking(business_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_customer_id ON email_tracking(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_sent_at ON email_tracking(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_tracking_email_type ON email_tracking(email_type);
CREATE INDEX IF NOT EXISTS idx_email_clicks_tracking_id ON email_clicks(email_tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_opens_tracking_id ON email_opens(email_tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_replies_tracking_id ON email_replies(email_tracking_id);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_business_date ON email_analytics_summary(business_id, date);

-- RLS Policies
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_opens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_analytics_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_tracking
CREATE POLICY "Users can view email tracking for their business" ON email_tracking
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert email tracking" ON email_tracking
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update email tracking" ON email_tracking
    FOR UPDATE USING (true);

-- RLS Policies for email_clicks
CREATE POLICY "Users can view email clicks for their business" ON email_clicks
    FOR SELECT USING (
        email_tracking_id IN (
            SELECT id FROM email_tracking WHERE business_id IN (
                SELECT business_id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "System can insert email clicks" ON email_clicks
    FOR INSERT WITH CHECK (true);

-- RLS Policies for email_opens
CREATE POLICY "Users can view email opens for their business" ON email_opens
    FOR SELECT USING (
        email_tracking_id IN (
            SELECT id FROM email_tracking WHERE business_id IN (
                SELECT business_id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "System can insert email opens" ON email_opens
    FOR INSERT WITH CHECK (true);

-- RLS Policies for email_replies
CREATE POLICY "Users can view email replies for their business" ON email_replies
    FOR SELECT USING (
        email_tracking_id IN (
            SELECT id FROM email_tracking WHERE business_id IN (
                SELECT business_id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "System can insert email replies" ON email_replies
    FOR INSERT WITH CHECK (true);

-- RLS Policies for email_analytics_summary
CREATE POLICY "Users can view analytics summary for their business" ON email_analytics_summary
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert analytics summary" ON email_analytics_summary
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update analytics summary" ON email_analytics_summary
    FOR UPDATE USING (true);

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_tracking_updated_at 
    BEFORE UPDATE ON email_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_analytics_summary_updated_at 
    BEFORE UPDATE ON email_analytics_summary 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
