-- Add missing RLS policies for profiles table
-- This fixes the "new row violates row-level security policy for table profiles" error

-- Drop existing profiles policies if they exist
DROP POLICY IF EXISTS "Users can view their profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their profiles" ON profiles;
DROP POLICY IF EXISTS "Users can delete their profiles" ON profiles;

-- Create new email-based RLS policies for profiles table
CREATE POLICY "Users can view their profiles by email" ON profiles
FOR SELECT USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Users can insert their profiles by email" ON profiles
FOR INSERT WITH CHECK (email = auth.jwt() ->> 'email');

CREATE POLICY "Users can update their profiles by email" ON profiles
FOR UPDATE USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Users can delete their profiles by email" ON profiles
FOR DELETE USING (email = auth.jwt() ->> 'email');

-- Also create a policy that allows profile creation when linking to existing businesses
-- This allows the tenancy logic to create profiles for existing businesses
CREATE POLICY "Allow profile creation for existing business owners" ON profiles
FOR INSERT WITH CHECK (
  email = auth.jwt() ->> 'email' OR
  business_id IN (
    SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'
  )
);

-- Show current profiles policies
SELECT 'Current profiles policies:' as info;
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;
