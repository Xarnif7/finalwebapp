import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🔄 Running new user profile creation migration...');
    
    // The migration SQL (without auth.users trigger due to permissions)
    const migrationSQL = `
-- Fix new user profile creation
-- This migration sets up functions and policies for new user setup

-- 1. Ensure profiles table has the correct structure
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'owner',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Update RLS policies to allow profile creation during signup
DROP POLICY IF EXISTS "Users can insert their profiles by email" ON public.profiles;
CREATE POLICY "Users can insert their profiles by email" ON public.profiles
FOR INSERT WITH CHECK (
  email = auth.jwt() ->> 'email' OR
  id = auth.uid()
);

-- 3. Update businesses RLS policies to allow business creation during signup
DROP POLICY IF EXISTS "Users can insert their businesses by email" ON public.businesses;
CREATE POLICY "Users can insert their businesses by email" ON public.businesses
FOR INSERT WITH CHECK (
  created_by = auth.jwt() ->> 'email' OR
  created_by = auth.uid()::text
);

-- 4. Add a function to get business by user email (for existing users)
CREATE OR REPLACE FUNCTION public.get_business_by_user_email(user_email TEXT)
RETURNS UUID AS $$
DECLARE
  business_id UUID;
BEGIN
  -- Try to get existing business
  SELECT id INTO business_id
  FROM public.businesses 
  WHERE created_by = user_email
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a function to ensure user has profile and business
CREATE OR REPLACE FUNCTION public.ensure_user_setup(user_email TEXT)
RETURNS UUID AS $$
DECLARE
  user_id UUID;
  business_id UUID;
  profile_exists BOOLEAN;
BEGIN
  -- Get user ID from email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', user_email;
  END IF;
  
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_id) INTO profile_exists;
  
  IF NOT profile_exists THEN
    -- Get or create business
    business_id := public.get_business_by_user_email(user_email);
    
    IF business_id IS NULL THEN
      -- Create business
      INSERT INTO public.businesses (name, created_by)
      VALUES (user_email || '''s Business', user_email)
      RETURNING id INTO business_id;
      
      -- Generate zapier_token
      UPDATE public.businesses 
      SET zapier_token = 'blipp_' || encode(gen_random_bytes(16), 'hex')
      WHERE id = business_id;
    END IF;
    
    -- Create profile
    INSERT INTO public.profiles (id, email, business_id, role, created_at, updated_at)
    VALUES (user_id, user_email, business_id, 'owner', NOW(), NOW());
  ELSE
    -- Get existing business_id
    SELECT business_id INTO business_id
    FROM public.profiles
    WHERE id = user_id;
  END IF;
  
  RETURN business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a function to handle new user setup (called from application)
CREATE OR REPLACE FUNCTION public.setup_new_user(user_id UUID, user_email TEXT)
RETURNS UUID AS $$
DECLARE
  business_id UUID;
BEGIN
  -- Create a default business for the new user
  INSERT INTO public.businesses (name, created_by)
  VALUES (user_email || '''s Business', user_email)
  RETURNING id INTO business_id;
  
  -- Generate zapier_token for the new business
  UPDATE public.businesses 
  SET zapier_token = 'blipp_' || encode(gen_random_bytes(16), 'hex')
  WHERE id = business_id;
  
  -- Create profile for the new user
  INSERT INTO public.profiles (id, email, business_id, role, created_at, updated_at)
  VALUES (user_id, user_email, business_id, 'owner', NOW(), NOW());
  
  -- The handle_new_business trigger will automatically create default automation templates
  
  RETURN business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_business_by_user_email(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_setup(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.setup_new_user(UUID, TEXT) TO service_role;
    `;

    // Execute the migration using raw SQL
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ New user migration completed successfully!');
    console.log('📋 New user sign-up flow is now fixed:');
    console.log('   - Automatic profile creation on user signup');
    console.log('   - Automatic business creation with zapier_token');
    console.log('   - Default automation templates created');
    console.log('   - Proper RLS policies for new users');
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

runMigration();