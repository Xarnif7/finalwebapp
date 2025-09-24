-- WORKING REVIEWS SETUP - MATCHES YOUR ACTUAL SCHEMA
-- This will work with your existing businesses table that has created_by as TEXT

-- Drop everything first
DROP TABLE IF EXISTS public.review_audit_log CASCADE;
DROP TABLE IF EXISTS public.review_response_templates CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.review_sources CASCADE;
DROP TABLE IF EXISTS public.feedback_cases CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS classify_sentiment() CASCADE;

-- Create review_sources table (for Google Business connections)
CREATE TABLE public.review_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    platform VARCHAR(50) NOT NULL,
    public_url TEXT NOT NULL,
    business_name VARCHAR(255),
    external_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT NOT NULL,
    UNIQUE(business_id, platform)
);

-- Create reviews table (the main reviews inbox)
CREATE TABLE public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    platform VARCHAR(50) NOT NULL,
    reviewer_name VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    review_url TEXT,
    review_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'unread',
    ai_draft TEXT,
    reply_text TEXT,
    sentiment VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT NOT NULL
);

-- Create response templates table
CREATE TABLE public.review_response_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    template_text TEXT NOT NULL,
    platform VARCHAR(50),
    sentiment VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT NOT NULL
);

-- Create audit log table
CREATE TABLE public.review_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feedback cases table
CREATE TABLE public.feedback_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    review_id UUID REFERENCES public.reviews(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'open',
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT NOT NULL
);

-- Create indexes
CREATE INDEX idx_review_sources_business_id ON public.review_sources(business_id);
CREATE INDEX idx_reviews_business_id ON public.reviews(business_id);
CREATE INDEX idx_reviews_platform ON public.reviews(platform);
CREATE INDEX idx_reviews_status ON public.reviews(status);
CREATE INDEX idx_templates_business_id ON public.review_response_templates(business_id);
CREATE INDEX idx_audit_log_review_id ON public.review_audit_log(review_id);
CREATE INDEX idx_feedback_cases_business_id ON public.feedback_cases(business_id);

-- Enable RLS
ALTER TABLE public.review_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_response_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_cases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (matching your businesses.created_by as TEXT)
CREATE POLICY "Users can manage their own business review sources" ON public.review_sources
    FOR ALL USING (
        created_by = (
            SELECT email FROM auth.users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own business reviews" ON public.reviews
    FOR ALL USING (
        created_by = (
            SELECT email FROM auth.users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own business templates" ON public.review_response_templates
    FOR ALL USING (
        created_by = (
            SELECT email FROM auth.users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can view audit logs for their business reviews" ON public.review_audit_log
    FOR ALL USING (
        review_id IN (
            SELECT id FROM public.reviews 
            WHERE created_by = (
                SELECT email FROM auth.users 
                WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage their own business feedback cases" ON public.feedback_cases
    FOR ALL USING (
        created_by = (
            SELECT email FROM auth.users 
            WHERE id = auth.uid()
        )
    );

-- Create simple trigger functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION classify_sentiment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.rating >= 4 THEN
        NEW.sentiment = 'positive';
    ELSIF NEW.rating = 3 THEN
        NEW.sentiment = 'neutral';
    ELSE
        NEW.sentiment = 'negative';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_review_sources_updated_at 
    BEFORE UPDATE ON public.review_sources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON public.reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON public.review_response_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_feedback_cases_updated_at 
    BEFORE UPDATE ON public.feedback_cases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER auto_classify_sentiment
    BEFORE INSERT OR UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION classify_sentiment();
