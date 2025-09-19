-- Add review_left column to customers table for exit rules
-- Run this in Supabase SQL Editor

-- Add review_left column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS review_left BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_customers_review_left 
ON customers(review_left) 
WHERE review_left = TRUE;

-- Add comment
COMMENT ON COLUMN customers.review_left IS 'Flag indicating if customer has already left a review (used for exit rules)';

-- Update existing customers to have review_left = false
UPDATE customers 
SET review_left = FALSE 
WHERE review_left IS NULL;
