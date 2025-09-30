-- Add business_id column to private_feedback table for QR code feedback
-- This allows QR code feedback to be stored without requiring a review_request_id

-- Add business_id column
ALTER TABLE public.private_feedback 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Add customer_name and customer_email columns for QR feedback
ALTER TABLE public.private_feedback 
ADD COLUMN IF NOT EXISTS customer_name TEXT;

ALTER TABLE public.private_feedback 
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Add source column to track where feedback came from
ALTER TABLE public.private_feedback 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'review_request';

-- Make review_request_id nullable since QR feedback doesn't need it
ALTER TABLE public.private_feedback 
ALTER COLUMN review_request_id DROP NOT NULL;

-- Add constraint to ensure either business_id or review_request_id is provided
ALTER TABLE public.private_feedback 
ADD CONSTRAINT check_business_or_review_request 
CHECK (
  (business_id IS NOT NULL AND review_request_id IS NULL) OR 
  (business_id IS NULL AND review_request_id IS NOT NULL)
);

-- Add index for business_id lookups
CREATE INDEX IF NOT EXISTS idx_private_feedback_business_id ON public.private_feedback(business_id);

-- Add index for source lookups
CREATE INDEX IF NOT EXISTS idx_private_feedback_source ON public.private_feedback(source);

-- Update RLS policy to handle business_id
DROP POLICY IF EXISTS "Users can manage their own business private feedback" ON public.private_feedback;

CREATE POLICY "Users can manage their own business private feedback" ON public.private_feedback
FOR ALL USING (
  business_id IN (
    SELECT b.id FROM public.businesses b 
    WHERE b.created_by = auth.uid()
  )
  OR
  review_request_id IN (
    SELECT rr.id FROM public.review_requests rr
    JOIN public.businesses b ON rr.business_id = b.id
    WHERE b.created_by = auth.uid()
  )
);

-- Add comment to explain the new columns
COMMENT ON COLUMN public.private_feedback.business_id IS 'Business ID for direct feedback (QR codes, etc.) - alternative to review_request_id';
COMMENT ON COLUMN public.private_feedback.customer_name IS 'Customer name for direct feedback submissions';
COMMENT ON COLUMN public.private_feedback.customer_email IS 'Customer email for direct feedback submissions';
COMMENT ON COLUMN public.private_feedback.source IS 'Source of feedback: review_request, qr_code, etc.';
