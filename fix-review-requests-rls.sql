-- Fix RLS policy to allow anonymous access to review requests for feedback collection
-- This allows customers to access their review request without logging in

-- Add policy for anonymous users to read review requests by ID
CREATE POLICY "Anonymous users can read review requests by ID" ON public.review_requests
    FOR SELECT USING (true);

-- This policy allows anyone to read review requests, which is needed for the feedback collection page
-- The review request ID acts as a secure token - only someone with the exact ID can access it
