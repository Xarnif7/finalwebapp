-- Reviews functionality database migration
-- Run this in your Supabase SQL editor

-- 1. Create review_sources table
CREATE TABLE IF NOT EXISTS review_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('google', 'facebook', 'yelp')),
    public_url TEXT,
    external_id TEXT NOT NULL,
    connection_type TEXT NOT NULL CHECK (connection_type IN ('places', 'page_oauth', 'api_key')),
    access_token TEXT,
    refresh_token TEXT,
    connected BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('google', 'facebook', 'yelp')),
    external_review_id TEXT NOT NULL,
    reviewer_name TEXT,
    rating NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5),
    text TEXT,
    review_url TEXT,
    review_created_at TIMESTAMP WITH TIME ZONE,
    reply_text TEXT,
    reply_posted_at TIMESTAMP WITH TIME ZONE,
    is_replied BOOLEAN DEFAULT false,
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_sources_business_id ON review_sources(business_id);
CREATE INDEX IF NOT EXISTS idx_review_sources_platform ON review_sources(platform);
CREATE INDEX IF NOT EXISTS idx_review_sources_connected ON review_sources(connected);

CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_platform ON reviews(platform);
CREATE INDEX IF NOT EXISTS idx_reviews_review_created_at ON reviews(review_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_sentiment ON reviews(sentiment);
CREATE INDEX IF NOT EXISTS idx_reviews_external_review_id ON reviews(external_review_id);

-- 4. Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_sources_business_platform ON review_sources(business_id, platform);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_business_platform_external ON reviews(business_id, platform, external_review_id);

-- 5. Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers for updated_at
CREATE TRIGGER IF NOT EXISTS trigger_review_sources_updated_at
    BEFORE UPDATE ON review_sources
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER IF NOT EXISTS trigger_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- 7. Enable Row Level Security
ALTER TABLE review_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for review_sources
CREATE POLICY "Users can view their business review sources" ON review_sources
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert review sources for their business" ON review_sources
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their business review sources" ON review_sources
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their business review sources" ON review_sources
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 9. Create RLS policies for reviews
CREATE POLICY "Users can view their business reviews" ON reviews
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert reviews for their business" ON reviews
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their business reviews" ON reviews
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their business reviews" ON reviews
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 10. Grant necessary permissions
GRANT ALL ON review_sources TO authenticated;
GRANT ALL ON reviews TO authenticated;

-- 11. Insert audit log entry for this migration
INSERT INTO audit_log (business_id, user_id, entity, action, details)
SELECT 
    p.business_id,
    p.id,
    'database',
    'migration',
    '{"migration": "reviews_schema", "version": "1.0", "tables": ["review_sources", "reviews"]}'::jsonb
FROM profiles p
WHERE p.business_id IS NOT NULL
LIMIT 1;
