-- Fix RLS policies for businesses table to allow creation
-- Drop existing policies that might be blocking creation
DROP POLICY IF EXISTS "Users can view their businesses by email" ON businesses;
DROP POLICY IF EXISTS "Users can insert their businesses by email" ON businesses;
DROP POLICY IF EXISTS "Users can update their businesses by email" ON businesses;
DROP POLICY IF EXISTS "Users can delete their businesses by email" ON businesses;
DROP POLICY IF EXISTS "Users can view their own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can insert their own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can update their own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can delete their own businesses" ON businesses;
DROP POLICY IF EXISTS "Business owners can view their own businesses" ON businesses;
DROP POLICY IF EXISTS "Business owners can insert their own businesses" ON businesses;
DROP POLICY IF EXISTS "Business owners can update their own businesses" ON businesses;

-- Create new policies that work with both email and UUID
CREATE POLICY "Users can view their businesses" ON businesses
    FOR SELECT USING (
        created_by = auth.jwt() ->> 'email' OR 
        created_by = auth.uid()::text
    );

CREATE POLICY "Users can insert their businesses" ON businesses
    FOR INSERT WITH CHECK (
        created_by = auth.jwt() ->> 'email' OR 
        created_by = auth.uid()::text
    );

CREATE POLICY "Users can update their businesses" ON businesses
    FOR UPDATE USING (
        created_by = auth.jwt() ->> 'email' OR 
        created_by = auth.uid()::text
    );

CREATE POLICY "Users can delete their businesses" ON businesses
    FOR DELETE USING (
        created_by = auth.jwt() ->> 'email' OR 
        created_by = auth.uid()::text
    );
