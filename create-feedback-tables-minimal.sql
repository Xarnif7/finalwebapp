-- Create only the missing private_feedback table and anonymous access policy
-- Run this in your Supabase SQL editor

-- 1. Create private_feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.private_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    review_request_id UUID NOT NULL REFERENCES public.review_requests(id) ON DELETE CASCADE,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    message TEXT,
    category TEXT DEFAULT 'general_experience',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add anonymous access policy for review_requests (for feedback collection)
-- This allows customers to access their review request without logging in
CREATE POLICY "Anonymous users can read review requests by ID" ON public.review_requests
    FOR SELECT USING (true);

-- 3. Create update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Create trigger for private_feedback table
CREATE TRIGGER update_private_feedback_updated_at 
    BEFORE UPDATE ON public.private_feedback 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
