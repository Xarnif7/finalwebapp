-- Fix new user profile creation
-- This migration sets up functions and policies for new user setup

-- 1. Create a function to handle new user setup (called from application)
CREATE OR REPLACE FUNCTION public.setup_new_user(user_id UUID, user_email TEXT)
RETURNS UUID AS $$
DECLARE
  business_id UUID;
BEGIN
  -- Create a default business for the new user (without created_by to avoid trigger issues)
  INSERT INTO public.businesses (name, email)
  VALUES (user_email || '''s Business', user_email)
  RETURNING id INTO business_id;
  
  -- Set created_by after insert to avoid trigger issues
  UPDATE public.businesses 
  SET created_by = user_email,
      zapier_token = 'blipp_' || encode(gen_random_bytes(16), 'hex')
  WHERE id = business_id;
  
  -- Create profile for the new user
  INSERT INTO public.profiles (id, email, business_id, role, created_at, updated_at)
  VALUES (user_id, user_email, business_id, 'owner', NOW(), NOW());
  
  -- The handle_new_business trigger will automatically create default automation templates
  
  RETURN business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure profiles table has the correct structure
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'owner',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Update RLS policies to allow profile creation during signup
DROP POLICY IF EXISTS "Users can insert their profiles by email" ON public.profiles;
CREATE POLICY "Users can insert their profiles by email" ON public.profiles
FOR INSERT WITH CHECK (
  email = auth.jwt() ->> 'email' OR
  id = auth.uid()
);

-- 5. Update businesses RLS policies to allow business creation during signup
DROP POLICY IF EXISTS "Users can insert their businesses by email" ON public.businesses;
CREATE POLICY "Users can insert their businesses by email" ON public.businesses
FOR INSERT WITH CHECK (
  created_by = auth.jwt() ->> 'email' OR
  created_by = auth.uid()::text
);

-- 6. Add a function to get business by user email (for existing users)
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

-- 7. Create a function to ensure user has profile and business
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
      -- Create business (without created_by to avoid trigger issues)
      INSERT INTO public.businesses (name, email)
      VALUES (user_email || '''s Business', user_email)
      RETURNING id INTO business_id;
      
      -- Set created_by and zapier_token after insert to avoid trigger issues
      UPDATE public.businesses 
      SET created_by = user_email,
          zapier_token = 'blipp_' || encode(gen_random_bytes(16), 'hex')
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

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.setup_new_user(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_business_by_user_email(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_setup(TEXT) TO service_role;

-- 9. Add comment
COMMENT ON FUNCTION public.setup_new_user(UUID, TEXT) IS 'Creates profile and business for new users (called from application)';
COMMENT ON FUNCTION public.ensure_user_setup(TEXT) IS 'Ensures user has profile and business setup';
