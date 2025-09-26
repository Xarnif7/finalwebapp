-- Fix RLS policies to allow business creation and linking
-- This ensures users can create businesses and link them to their profiles

-- First, let's check current RLS policies on businesses table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'businesses';

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can insert businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can update businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can delete businesses" ON public.businesses;

-- Create new policies that allow business creation and management
CREATE POLICY "Users can view their own businesses" ON public.businesses
FOR SELECT USING (
    id IN (
        SELECT business_id FROM public.profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert businesses" ON public.businesses
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own businesses" ON public.businesses
FOR UPDATE USING (
    id IN (
        SELECT business_id FROM public.profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own businesses" ON public.businesses
FOR DELETE USING (
    id IN (
        SELECT business_id FROM public.profiles WHERE user_id = auth.uid()
    )
);

-- Also ensure profiles table allows business_id updates
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (user_id = auth.uid());

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('businesses', 'profiles')
ORDER BY tablename, policyname;
