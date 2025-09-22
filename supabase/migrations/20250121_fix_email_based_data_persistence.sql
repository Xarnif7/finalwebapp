-- Fix email-based data persistence
-- This ensures all data is tied to email addresses and persists across subscription changes

-- 1. Update businesses.created_by to use email instead of UUID
-- First, let's see what we have
SELECT 'Current businesses.created_by values:' as info;
SELECT id, name, created_by, created_at FROM businesses ORDER BY created_at DESC LIMIT 10;

-- 2. Update businesses.created_by to use email addresses
-- We need to map the UUIDs to email addresses from profiles
UPDATE businesses 
SET created_by = (
  SELECT p.email 
  FROM profiles p 
  WHERE p.id = businesses.created_by::uuid
)
WHERE created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 3. Update customers.created_by to use email addresses
UPDATE customers 
SET created_by = (
  SELECT p.email 
  FROM profiles p 
  WHERE p.id = customers.created_by::uuid
)
WHERE created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 4. Create a function to get business by email
CREATE OR REPLACE FUNCTION get_business_by_email(user_email TEXT)
RETURNS UUID AS $$
DECLARE
  business_id UUID;
BEGIN
  SELECT id INTO business_id
  FROM businesses 
  WHERE created_by = user_email
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a function to ensure business exists for email
CREATE OR REPLACE FUNCTION ensure_business_for_email(user_email TEXT, business_name TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  business_id UUID;
  default_name TEXT;
BEGIN
  -- Try to get existing business
  SELECT id INTO business_id
  FROM businesses 
  WHERE created_by = user_email
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no business exists, create one
  IF business_id IS NULL THEN
    default_name := COALESCE(business_name, user_email || '''s Business');
    
    INSERT INTO businesses (name, created_by)
    VALUES (default_name, user_email)
    RETURNING id INTO business_id;
    
    -- Generate zapier_token for new business
    UPDATE businesses 
    SET zapier_token = 'blipp_' || encode(gen_random_bytes(16), 'hex')
    WHERE id = business_id;
  END IF;
  
  RETURN business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update profiles to use email-based business linking
-- First, let's see current state
SELECT 'Current profiles business_id values:' as info;
SELECT p.id, p.email, p.business_id, b.name as business_name, b.created_by as business_owner_email
FROM profiles p
LEFT JOIN businesses b ON p.business_id = b.id
ORDER BY p.created_at DESC LIMIT 10;

-- Update profiles to point to the correct business based on email
UPDATE profiles 
SET business_id = get_business_by_email(profiles.email)
WHERE profiles.email IS NOT NULL;

-- 7. Create RLS policies that work with email-based ownership
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their businesses" ON businesses;
DROP POLICY IF EXISTS "Users can insert their businesses" ON businesses;
DROP POLICY IF EXISTS "Users can update their businesses" ON businesses;
DROP POLICY IF EXISTS "Users can delete their businesses" ON businesses;

-- Create new email-based policies
CREATE POLICY "Users can view their businesses by email" ON businesses
FOR SELECT USING (created_by = auth.jwt() ->> 'email');

CREATE POLICY "Users can insert their businesses by email" ON businesses
FOR INSERT WITH CHECK (created_by = auth.jwt() ->> 'email');

CREATE POLICY "Users can update their businesses by email" ON businesses
FOR UPDATE USING (created_by = auth.jwt() ->> 'email');

CREATE POLICY "Users can delete their businesses by email" ON businesses
FOR DELETE USING (created_by = auth.jwt() ->> 'email');

-- 8. Update customers RLS policies
DROP POLICY IF EXISTS "Users can view their customers" ON customers;
DROP POLICY IF EXISTS "Users can insert their customers" ON customers;
DROP POLICY IF EXISTS "Users can update their customers" ON customers;
DROP POLICY IF EXISTS "Users can delete their customers" ON customers;

CREATE POLICY "Users can view their customers by email" ON customers
FOR SELECT USING (
  business_id IN (
    SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can insert their customers by email" ON customers
FOR INSERT WITH CHECK (
  business_id IN (
    SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can update their customers by email" ON customers
FOR UPDATE USING (
  business_id IN (
    SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can delete their customers by email" ON customers
FOR DELETE USING (
  business_id IN (
    SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'
  )
);

-- 9. Show final state
SELECT 'Final businesses state:' as info;
SELECT id, name, created_by, created_at FROM businesses ORDER BY created_at DESC;

SELECT 'Final profiles state:' as info;
SELECT p.id, p.email, p.business_id, b.name as business_name, b.created_by as business_owner_email
FROM profiles p
LEFT JOIN businesses b ON p.business_id = b.id
ORDER BY p.created_at DESC;
