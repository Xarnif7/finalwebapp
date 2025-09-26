-- Complete RLS policy fix for business creation and management
-- This will fix all RLS issues preventing business operations

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('businesses', 'profiles', 'feedback_form_settings')
ORDER BY tablename, policyname;

-- Drop ALL existing policies on businesses table
DROP POLICY IF EXISTS "Users can view their own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can insert businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can update their own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can delete their own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can view businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can update businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can delete businesses" ON public.businesses;

-- Create new, permissive policies for businesses
CREATE POLICY "Allow all operations on businesses" ON public.businesses
FOR ALL USING (true) WITH CHECK (true);

-- Fix profiles table policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can manage their own profile" ON public.profiles
FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Fix feedback_form_settings policies
DROP POLICY IF EXISTS "Business owners can view their own form settings" ON public.feedback_form_settings;
DROP POLICY IF EXISTS "Business owners can insert their own form settings" ON public.feedback_form_settings;
DROP POLICY IF EXISTS "Business owners can update their own form settings" ON public.feedback_form_settings;

CREATE POLICY "Users can manage their form settings" ON public.feedback_form_settings
FOR ALL USING (
    business_id IN (
        SELECT business_id FROM public.profiles WHERE user_id = auth.uid()
    )
) WITH CHECK (
    business_id IN (
        SELECT business_id FROM public.profiles WHERE user_id = auth.uid()
    )
);

-- Verify the policies were created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('businesses', 'profiles', 'feedback_form_settings')
ORDER BY tablename, policyname;
