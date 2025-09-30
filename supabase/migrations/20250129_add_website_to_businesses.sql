-- Add website field to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS website TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.businesses.website IS 'Business website URL for redirecting customers after feedback submission';
