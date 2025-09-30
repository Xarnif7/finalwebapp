-- Fix feedback form issues
-- Run this in your Supabase dashboard

-- Add website field to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS website TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.businesses.website IS 'Business website URL for redirecting customers after feedback submission';

-- Add resolved field to private_feedback table
ALTER TABLE public.private_feedback 
ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN public.private_feedback.resolved IS 'Whether the feedback has been marked as resolved by the business owner';
