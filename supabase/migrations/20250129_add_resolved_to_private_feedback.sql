-- Add resolved field to private_feedback table
ALTER TABLE public.private_feedback 
ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN public.private_feedback.resolved IS 'Whether the feedback has been marked as resolved by the business owner';
