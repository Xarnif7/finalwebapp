-- Add google_review_url column to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS google_review_url TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.businesses.google_review_url IS 'Direct URL to Google Maps review page for this business';
