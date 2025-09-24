-- PERFECT REVIEWS SETUP - No errors, clean and simple
-- This will work without any issues

-- Step 1: Drop everything that might exist (safely)
DROP TABLE IF EXISTS public.review_audit_log CASCADE;
DROP TABLE IF EXISTS public.review_response_templates CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.review_sources CASCADE;

-- Step 2: Drop functions (safely)
DROP FUNCTION IF EXISTS update_review_sources_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_reviews_updated_at() CASCADE;
DROP FUNCTION IF EXISTS classify_review_sentiment() CASCADE;
DROP FUNCTION IF EXISTS set_review_sla() CASCADE;
DROP FUNCTION IF EXISTS update_templates_updated_at() CASCADE;
DROP FUNCTION IF EXISTS log_review_action() CASCADE;

-- Step 3: Create the tables with correct UUID types

-- Create review_sources table
CREATE TABLE public.review_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    platform VARCHAR(50) NOT NULL,
    public_url TEXT NOT NULL,
    business_name VARCHAR(255),
    connection_type VARCHAR(50),
    external_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(50) DEFAULT 'pending',
    sync_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(business_id, platform)
);

-- Create reviews table
CREATE TABLE public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    
    -- Core review data
    platform VARCHAR(50) NOT NULL,
    platform_review_id VARCHAR(255),
    customer_id TEXT,
    job_id TEXT,
    
    -- Review content
    reviewer_name VARCHAR(255) NOT NULL,
    reviewer_email VARCHAR(255),
    reviewer_phone VARCHAR(20),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    review_url TEXT,
    
    -- Timestamps
    review_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    review_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Workflow management
    status VARCHAR(50) DEFAULT 'unread' CHECK (status IN (
        'unread', 'needs_response', 'responded', 'resolved', 'edited_since_response'
    )),
    assigned_to UUID REFERENCES auth.users(id),
    due_at TIMESTAMP WITH TIME ZONE,
    
    -- Response management
    ai_draft TEXT,
    reply_text TEXT,
    reply_posted_at TIMESTAMP WITH TIME ZONE,
    reply_edit_history JSONB DEFAULT '[]',
    
    -- Classification and analysis
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    nps_bucket VARCHAR(20) CHECK (nps_bucket IN ('detractor', 'passive', 'promoter')),
    topics TEXT[],
    tags TEXT[],
    
    -- Job context
    job_type VARCHAR(255),
    job_notes TEXT,
    job_amount DECIMAL(10,2),
    job_location TEXT,
    
    -- Metadata
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    is_private_feedback BOOLEAN DEFAULT FALSE,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create response templates table
CREATE TABLE public.review_response_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    template_text TEXT NOT NULL,
    platform VARCHAR(50),
    sentiment VARCHAR(20),
    job_type VARCHAR(255),
    tone VARCHAR(50) DEFAULT 'professional',
    is_default BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create audit log table
CREATE TABLE public.review_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX idx_review_sources_business_id ON public.review_sources(business_id);
CREATE INDEX idx_review_sources_platform ON public.review_sources(platform);
CREATE INDEX idx_review_sources_is_active ON public.review_sources(is_active);

CREATE INDEX idx_reviews_business_id ON public.reviews(business_id);
CREATE INDEX idx_reviews_platform ON public.reviews(platform);
CREATE INDEX idx_reviews_status ON public.reviews(status);
CREATE INDEX idx_reviews_assigned_to ON public.reviews(assigned_to);
CREATE INDEX idx_reviews_due_at ON public.reviews(due_at);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);
CREATE INDEX idx_reviews_sentiment ON public.reviews(sentiment);
CREATE INDEX idx_reviews_review_created_at ON public.reviews(review_created_at DESC);
CREATE INDEX idx_reviews_tags ON public.reviews USING GIN(tags);
CREATE INDEX idx_reviews_topics ON public.reviews USING GIN(topics);

CREATE INDEX idx_templates_business_id ON public.review_response_templates(business_id);
CREATE INDEX idx_templates_platform ON public.review_response_templates(platform);

CREATE INDEX idx_audit_log_review_id ON public.review_audit_log(review_id);
CREATE INDEX idx_audit_log_created_at ON public.review_audit_log(created_at DESC);

-- Step 5: Enable RLS
ALTER TABLE public.review_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_response_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_audit_log ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies (now that tables exist)
CREATE POLICY "Users can manage their own business review sources" ON public.review_sources
    FOR ALL USING (
        business_id IN (
            SELECT id FROM public.businesses 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can view their own business reviews" ON public.reviews
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM public.businesses 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert reviews for their business" ON public.reviews
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM public.businesses 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own business reviews" ON public.reviews
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM public.businesses 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own business reviews" ON public.reviews
    FOR DELETE USING (
        business_id IN (
            SELECT id FROM public.businesses 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own business templates" ON public.review_response_templates
    FOR ALL USING (
        business_id IN (
            SELECT id FROM public.businesses 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can view audit logs for their business reviews" ON public.review_audit_log
    FOR SELECT USING (
        review_id IN (
            SELECT id FROM public.reviews 
            WHERE business_id IN (
                SELECT id FROM public.businesses 
                WHERE created_by = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert audit logs for their business reviews" ON public.review_audit_log
    FOR INSERT WITH CHECK (
        review_id IN (
            SELECT id FROM public.reviews 
            WHERE business_id IN (
                SELECT id FROM public.businesses 
                WHERE created_by = auth.uid()
            )
        )
    );

-- Step 7: Create trigger functions
CREATE OR REPLACE FUNCTION update_review_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION classify_review_sentiment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.rating >= 4 THEN
        NEW.sentiment = 'positive';
        NEW.nps_bucket = 'promoter';
    ELSIF NEW.rating = 3 THEN
        NEW.sentiment = 'neutral';
        NEW.nps_bucket = 'passive';
    ELSE
        NEW.sentiment = 'negative';
        NEW.nps_bucket = 'detractor';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION set_review_sla()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.rating <= 3 THEN
        NEW.due_at = NEW.created_at + INTERVAL '4 hours';
        NEW.status = 'needs_response';
    ELSIF NEW.rating = 4 THEN
        NEW.due_at = NEW.created_at + INTERVAL '24 hours';
    ELSE
        NEW.due_at = NEW.created_at + INTERVAL '48 hours';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION log_review_action()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.review_audit_log (
        review_id,
        user_id,
        action,
        old_value,
        new_value
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        auth.uid(),
        TG_OP,
        CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Step 8: Create triggers
CREATE TRIGGER update_review_sources_updated_at 
    BEFORE UPDATE ON public.review_sources 
    FOR EACH ROW EXECUTE FUNCTION update_review_sources_updated_at();

CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON public.reviews 
    FOR EACH ROW EXECUTE FUNCTION update_reviews_updated_at();

CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON public.review_response_templates 
    FOR EACH ROW EXECUTE FUNCTION update_templates_updated_at();

CREATE TRIGGER auto_classify_sentiment
    BEFORE INSERT OR UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION classify_review_sentiment();

CREATE TRIGGER set_review_sla
    BEFORE INSERT ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION set_review_sla();

CREATE TRIGGER audit_reviews_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION log_review_action();
