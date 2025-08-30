-- Review Requests functionality database migration
-- Run this in your Supabase SQL editor

-- 1. Create review_requests table
CREATE TABLE IF NOT EXISTS review_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'both')),
    review_link TEXT,
    message TEXT,
    email_status TEXT DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent', 'failed', 'skipped')),
    sms_status TEXT DEFAULT 'pending' CHECK (sms_status IN ('pending', 'sent', 'failed', 'skipped')),
    email_sent_at TIMESTAMP WITH TIME ZONE,
    sms_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create templates table for storing email/SMS templates
CREATE TABLE IF NOT EXISTS templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('email', 'sms')),
    subject TEXT, -- Only for email templates
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_requests_business_id ON review_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_customer_id ON review_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_channel ON review_requests(channel);
CREATE INDEX IF NOT EXISTS idx_review_requests_created_at ON review_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_requests_email_status ON review_requests(email_status);
CREATE INDEX IF NOT EXISTS idx_review_requests_sms_status ON review_requests(sms_status);

CREATE INDEX IF NOT EXISTS idx_templates_business_id ON templates(business_id);
CREATE INDEX IF NOT EXISTS idx_templates_kind ON templates(kind);

-- 4. Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_business_kind ON templates(business_id, kind);

-- 5. Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers for updated_at
CREATE TRIGGER IF NOT EXISTS trigger_review_requests_updated_at
    BEFORE UPDATE ON review_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER IF NOT EXISTS trigger_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- 7. Enable Row Level Security
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for review_requests
CREATE POLICY "Users can view their business review requests" ON review_requests
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert review requests for their business" ON review_requests
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their business review requests" ON review_requests
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their business review requests" ON review_requests
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 9. Create RLS policies for templates
CREATE POLICY "Users can view their business templates" ON templates
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert templates for their business" ON templates
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their business templates" ON templates
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their business templates" ON templates
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 10. Grant necessary permissions
GRANT ALL ON review_requests TO authenticated;
GRANT ALL ON templates TO authenticated;

-- 11. Insert audit log entry for this migration
INSERT INTO audit_log (business_id, user_id, entity, action, details)
SELECT 
    p.business_id,
    p.id,
    'database',
    'migration',
    '{"migration": "review_requests_schema", "version": "1.0", "tables": ["review_requests", "templates"]}'::jsonb
FROM profiles p
WHERE p.business_id IS NOT NULL
LIMIT 1;
