-- Database Enhancement for Reviews System
-- This migration adds the missing tables and enhances existing ones

-- First, ensure we have the necessary columns in the reviews table
DO $$ BEGIN
    -- Add business_id column if it doesn't exist (should already exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'business_id') THEN
        ALTER TABLE public.reviews ADD COLUMN business_id UUID NOT NULL;
    END IF;
    
    -- Add responded column if it doesn't exist (rename from is_replied if needed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'responded') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'is_replied') THEN
            ALTER TABLE public.reviews RENAME COLUMN is_replied TO responded;
        ELSE
            ALTER TABLE public.reviews ADD COLUMN responded BOOLEAN DEFAULT false;
        END IF;
    END IF;
    
    -- Add author_name column if it doesn't exist (rename from reviewer_name if needed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'author_name') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'reviewer_name') THEN
            ALTER TABLE public.reviews RENAME COLUMN reviewer_name TO author_name;
        ELSE
            ALTER TABLE public.reviews ADD COLUMN author_name TEXT;
        END IF;
    END IF;
    
    -- Add body column if it doesn't exist (rename from text if needed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'body') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'text') THEN
            ALTER TABLE public.reviews RENAME COLUMN text TO body;
        ELSE
            ALTER TABLE public.reviews ADD COLUMN body TEXT;
        END IF;
    END IF;
    
    -- Add created_at column if it doesn't exist (rename from review_created_at if needed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'created_at') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'review_created_at') THEN
            ALTER TABLE public.reviews RENAME COLUMN review_created_at TO created_at;
        ELSE
            ALTER TABLE public.reviews ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Create review_replies table
CREATE TABLE IF NOT EXISTS public.review_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    review_id UUID NOT NULL,
    reply_text TEXT NOT NULL,
    replied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    channel TEXT NOT NULL CHECK (channel IN ('manual', 'email', 'sms', 'both')) DEFAULT 'manual',
    responder_id UUID NOT NULL,
    business_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create review_requests table
CREATE TABLE IF NOT EXISTS public.review_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'both')),
    email_status TEXT NOT NULL CHECK (email_status IN ('queued', 'sent', 'failed', 'skipped')) DEFAULT 'queued',
    sms_status TEXT NOT NULL CHECK (sms_status IN ('queued', 'sent', 'failed', 'skipped')) DEFAULT 'queued',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    review_link TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('email', 'sms')),
    subject TEXT, -- only for email
    body TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON public.review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_business_id ON public.review_replies(business_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_replied_at ON public.review_replies(replied_at);

CREATE INDEX IF NOT EXISTS idx_review_requests_business_id ON public.review_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_customer_id ON public.review_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_requested_at ON public.review_requests(requested_at);

CREATE INDEX IF NOT EXISTS idx_templates_business_id ON public.templates(business_id);
CREATE INDEX IF NOT EXISTS idx_templates_kind ON public.templates(kind);

-- Add business_id + created_at indexes for all tables
CREATE INDEX IF NOT EXISTS idx_reviews_business_created ON public.reviews(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_review_replies_business_created ON public.review_replies(business_id, replied_at);
CREATE INDEX IF NOT EXISTS idx_review_requests_business_created ON public.review_requests(business_id, requested_at);

-- Enable Row Level Security
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_replies
CREATE POLICY "Users can view their own review replies" ON public.review_replies
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own review replies" ON public.review_replies
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own review replies" ON public.review_replies
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own review replies" ON public.review_replies
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for review_requests
CREATE POLICY "Users can view their own review requests" ON public.review_requests
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own review requests" ON public.review_requests
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own review requests" ON public.review_requests
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own review requests" ON public.review_requests
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for templates
CREATE POLICY "Users can view their own templates" ON public.templates
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own templates" ON public.templates
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own templates" ON public.templates
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own templates" ON public.templates
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to new tables
CREATE TRIGGER set_templates_updated_at
    BEFORE UPDATE ON public.templates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Insert default templates for existing businesses
INSERT INTO public.templates (business_id, kind, subject, body)
SELECT DISTINCT 
    p.business_id,
    'email',
    'We''d love your feedback!',
    'Hi {customer.name},

Thank you for choosing our services! We would really appreciate if you could take a moment to share your experience with us.

{review_link}

Your feedback helps us improve and serve our customers better.

Best regards,
{company_name}'
FROM public.profiles p
WHERE p.business_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.templates t 
    WHERE t.business_id = p.business_id AND t.kind = 'email'
);

INSERT INTO public.templates (business_id, kind, body)
SELECT DISTINCT 
    p.business_id,
    'sms',
    'Hi {customer.name}! Thanks for choosing us. We''d love your feedback: {review_link}'
FROM public.profiles p
WHERE p.business_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.templates t 
    WHERE t.business_id = p.business_id AND t.kind = 'sms'
);
