-- Create reviews table for storing collected reviews from various platforms
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'google', 'facebook', 'yelp', 'bbb', etc.
    platform_review_id VARCHAR(255), -- External platform's review ID
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    review_date TIMESTAMP WITH TIME ZONE NOT NULL,
    review_url TEXT, -- Direct link to the review on the platform
    
    -- Response tracking
    response_status VARCHAR(50) DEFAULT 'unread' CHECK (response_status IN ('unread', 'responded', 'needs_followup', 'ignored')),
    response_text TEXT,
    response_date TIMESTAMP WITH TIME ZONE,
    response_url TEXT, -- Link to business owner's response
    
    -- Internal tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Indexes for performance
    CONSTRAINT reviews_business_platform_rating_idx UNIQUE (business_id, platform, platform_review_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON public.reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_platform ON public.reviews(platform);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_response_status ON public.reviews(response_status);
CREATE INDEX IF NOT EXISTS idx_reviews_review_date ON public.reviews(review_date DESC);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON public.reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
