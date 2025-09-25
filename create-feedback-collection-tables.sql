-- Create tables for feedback collection system
-- Run this in your Supabase SQL editor

-- 1. Create review_requests table for tracking review requests
CREATE TABLE IF NOT EXISTS public.review_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'both')),
    strategy TEXT NOT NULL DEFAULT 'immediate' CHECK (strategy IN ('immediate', 'magic')),
    best_send_at TIMESTAMPTZ NULL,
    sent_at TIMESTAMPTZ NULL,
    delivered_at TIMESTAMPTZ NULL,
    opened_at TIMESTAMPTZ NULL,
    clicked_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sent', 'opened', 'clicked', 'completed', 'expired')),
    tech_id UUID NULL,
    job_type TEXT NULL,
    job_end_at TIMESTAMPTZ NULL,
    review_link TEXT NULL,
    message TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT NOT NULL
);

-- 2. Create templates table for storing email/SMS templates
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('email', 'sms')),
    subject TEXT, -- Only for email templates
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT NOT NULL,
    UNIQUE(business_id, kind)
);

-- 3. Create private_feedback table for storing private feedback
CREATE TABLE IF NOT EXISTS public.private_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    review_request_id UUID NOT NULL REFERENCES public.review_requests(id) ON DELETE CASCADE,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    category TEXT NOT NULL DEFAULT 'general_experience',
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ NULL
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_requests_business_id ON public.review_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_customer_id ON public.review_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON public.review_requests(status);
CREATE INDEX IF NOT EXISTS idx_review_requests_created_at ON public.review_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_templates_business_id ON public.templates(business_id);
CREATE INDEX IF NOT EXISTS idx_templates_kind ON public.templates(kind);

CREATE INDEX IF NOT EXISTS idx_private_feedback_review_request_id ON public.private_feedback(review_request_id);
CREATE INDEX IF NOT EXISTS idx_private_feedback_sentiment ON public.private_feedback(sentiment);
CREATE INDEX IF NOT EXISTS idx_private_feedback_created_at ON public.private_feedback(created_at DESC);

-- 5. Enable RLS
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_feedback ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies (using created_by as TEXT to match your schema)
CREATE POLICY "Users can manage their own business review requests" ON public.review_requests
    FOR ALL USING (
        created_by = (
            SELECT email FROM auth.users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own business templates" ON public.templates
    FOR ALL USING (
        created_by = (
            SELECT email FROM auth.users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can view private feedback for their business" ON public.private_feedback
    FOR ALL USING (
        review_request_id IN (
            SELECT id FROM public.review_requests 
            WHERE created_by = (
                SELECT email FROM auth.users 
                WHERE id = auth.uid()
            )
        )
    );

-- 7. Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Create triggers
CREATE TRIGGER update_review_requests_updated_at 
    BEFORE UPDATE ON public.review_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON public.templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 9. Insert default templates for existing businesses
INSERT INTO public.templates (business_id, kind, subject, body, created_by)
SELECT DISTINCT 
    b.id,
    'email',
    'How was your experience with {company_name}?',
    'Hi {customer.name},

Thank you for choosing {company_name}! We''d love to hear about your experience.

Please take a moment to share your feedback:
{review_link}

Your feedback helps us improve and serve our customers better.

Best regards,
{company_name}',
    b.created_by
FROM public.businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM public.templates t 
    WHERE t.business_id = b.id AND t.kind = 'email'
);

INSERT INTO public.templates (business_id, kind, body, created_by)
SELECT DISTINCT 
    b.id,
    'sms',
    'Hi {customer.name}! Thanks for choosing {company_name}. How was your experience? Share feedback: {review_link}',
    b.created_by
FROM public.businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM public.templates t 
    WHERE t.business_id = b.id AND t.kind = 'sms'
);
