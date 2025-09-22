-- Fix profile business_id links for existing users
-- This migration updates profiles to point to the correct business

-- Update profiles to link to the business they created
UPDATE profiles 
SET business_id = (
  SELECT b.id 
  FROM businesses b 
  WHERE b.created_by = profiles.id 
  ORDER BY b.created_at ASC 
  LIMIT 1
)
WHERE profiles.business_id = profiles.id 
AND EXISTS (
  SELECT 1 FROM businesses b 
  WHERE b.created_by = profiles.id
);

-- For profiles that still have business_id = user_id but no business exists,
-- create a default business
INSERT INTO businesses (id, name, created_by)
SELECT 
  profiles.id, -- Use user ID as business ID for these edge cases
  COALESCE(profiles.email || '''s Business', 'Default Business'),
  profiles.id
FROM profiles 
WHERE profiles.business_id = profiles.id 
AND NOT EXISTS (
  SELECT 1 FROM businesses b 
  WHERE b.created_by = profiles.id
);

-- Update the remaining profiles to point to their default business
UPDATE profiles 
SET business_id = (
  SELECT b.id 
  FROM businesses b 
  WHERE b.created_by = profiles.id 
  ORDER BY b.created_at ASC 
  LIMIT 1
)
WHERE profiles.business_id = profiles.id;

-- Add zapier_token to businesses that don't have one
UPDATE businesses 
SET zapier_token = 'blipp_' || encode(gen_random_bytes(16), 'hex')
WHERE zapier_token IS NULL;
