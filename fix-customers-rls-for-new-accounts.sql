-- Fix RLS policies for customers table to work with new account structure
-- This ensures both old email-based accounts and new profile-based accounts work

-- Drop existing customers policies
DROP POLICY IF EXISTS "Users can view their customers by email" ON customers;
DROP POLICY IF EXISTS "Users can insert their customers by email" ON customers;
DROP POLICY IF EXISTS "Users can update their customers by email" ON customers;
DROP POLICY IF EXISTS "Users can delete their customers by email" ON customers;
DROP POLICY IF EXISTS "Users can view customers from their businesses" ON customers;
DROP POLICY IF EXISTS "Users can insert customers to their businesses" ON customers;
DROP POLICY IF EXISTS "Users can update customers from their businesses" ON customers;
DROP POLICY IF EXISTS "Users can delete customers from their businesses" ON customers;

-- Create new policies that work with both email-based and profile-based accounts
CREATE POLICY "Users can view their customers" ON customers
FOR SELECT USING (
  -- For old email-based accounts
  created_by = auth.jwt() ->> 'email' OR
  -- For new profile-based accounts
  business_id IN (
    SELECT business_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their customers" ON customers
FOR INSERT WITH CHECK (
  -- For old email-based accounts
  created_by = auth.jwt() ->> 'email' OR
  -- For new profile-based accounts
  business_id IN (
    SELECT business_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their customers" ON customers
FOR UPDATE USING (
  -- For old email-based accounts
  created_by = auth.jwt() ->> 'email' OR
  -- For new profile-based accounts
  business_id IN (
    SELECT business_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their customers" ON customers
FOR DELETE USING (
  -- For old email-based accounts
  created_by = auth.jwt() ->> 'email' OR
  -- For new profile-based accounts
  business_id IN (
    SELECT business_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Also fix businesses policies to work with both structures
DROP POLICY IF EXISTS "Users can view their businesses by email" ON businesses;
DROP POLICY IF EXISTS "Users can insert their businesses by email" ON businesses;
DROP POLICY IF EXISTS "Users can update their businesses by email" ON businesses;
DROP POLICY IF EXISTS "Users can delete their businesses by email" ON businesses;
DROP POLICY IF EXISTS "Users can view their own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can insert their own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can update their own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can delete their own businesses" ON businesses;

CREATE POLICY "Users can view their businesses" ON businesses
FOR SELECT USING (
  -- For old email-based accounts
  created_by = auth.jwt() ->> 'email' OR
  -- For new profile-based accounts
  id IN (
    SELECT business_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their businesses" ON businesses
FOR INSERT WITH CHECK (
  -- For old email-based accounts
  created_by = auth.jwt() ->> 'email' OR
  -- For new profile-based accounts (when creating business for profile)
  true -- Allow creation, will be linked via profile creation
);

CREATE POLICY "Users can update their businesses" ON businesses
FOR UPDATE USING (
  -- For old email-based accounts
  created_by = auth.jwt() ->> 'email' OR
  -- For new profile-based accounts
  id IN (
    SELECT business_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their businesses" ON businesses
FOR DELETE USING (
  -- For old email-based accounts
  created_by = auth.jwt() ->> 'email' OR
  -- For new profile-based accounts
  id IN (
    SELECT business_id FROM profiles WHERE user_id = auth.uid()
  )
);
