-- Reviews Integration Database Migration
-- Run this in your Supabase SQL editor

-- 1. Create review_sources table
CREATE TABLE IF NOT EXISTS review_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('google', 'facebook', 'yelp')),
    public_url TEXT,
    external_id TEXT, -- google place_id, facebook page_id, or yelp business id
    connection_type TEXT NOT NULL CHECK (connection_type IN ('places', 'gbp_oauth', 'page_oauth', 'api_key')),
    access_token TEXT, -- nullable, encrypted if needed
    refresh_token TEXT, -- nullable, encrypted if needed
    connected BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
    review_created_at TIMESTAMPTZ,
    reply_text TEXT,
    reply_posted_at TIMESTAMPTZ,
    is_replied BOOLEAN DEFAULT false,
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_sources_business_platform ON review_sources(business_id, platform);
CREATE INDEX IF NOT EXISTS idx_reviews_business_platform_created ON reviews(business_id, platform, review_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_platform_sentiment ON reviews(platform, sentiment);

-- 4. Create unique constraint for reviews
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_external ON reviews(business_id, platform, external_review_id);

-- 5. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers for updated_at
CREATE TRIGGER trigger_review_sources_updated_at
    BEFORE UPDATE ON review_sources
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- 7. Create RLS policies for review_sources
ALTER TABLE review_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own review sources" ON review_sources
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own review sources" ON review_sources
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own review sources" ON review_sources
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own review sources" ON review_sources
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 8. Create RLS policies for reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reviews" ON reviews
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own reviews" ON reviews
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own reviews" ON reviews
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own reviews" ON reviews
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 9. Grant permissions
GRANT ALL ON review_sources TO authenticated;
GRANT ALL ON reviews TO authenticated;

-- 10. Insert some sample data for testing (optional)
-- INSERT INTO review_sources (business_id, platform, public_url, external_id, connection_type, connected)
-- VALUES 
--     ('your-business-uuid', 'google', 'https://maps.google.com/...', 'ChIJ...', 'places', true),
--     ('your-business-uuid', 'facebook', 'https://facebook.com/...', '123456789', 'page_oauth', false),
--     ('your-business-uuid', 'yelp', 'https://yelp.com/biz/...', 'abc123', 'api_key', false);
