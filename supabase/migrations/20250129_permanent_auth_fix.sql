-- PERMANENT FIX: Complete authentication and user setup system
-- This replaces all temporary solutions with a robust, long-term approach

-- 1. Drop the problematic trigger that's causing issues
DROP TRIGGER IF EXISTS on_business_created ON public.businesses;
DROP FUNCTION IF EXISTS public.set_business_owner();

-- 2. Create a robust user setup function that handles everything
CREATE OR REPLACE FUNCTION public.setup_new_user_complete(user_id UUID, user_email TEXT)
RETURNS JSON AS $$
DECLARE
  business_id UUID;
  profile_id UUID;
  result JSON;
BEGIN
  -- Check if user already has a profile
  SELECT id, business_id INTO profile_id, business_id
  FROM public.profiles 
  WHERE id = user_id;
  
  -- If profile exists, return existing data
  IF profile_id IS NOT NULL THEN
    SELECT json_build_object(
      'success', true,
      'business_id', business_id,
      'profile_id', profile_id,
      'message', 'User already has profile'
    ) INTO result;
    RETURN result;
  END IF;
  
  -- Create business with proper ownership
  INSERT INTO public.businesses (
    name, 
    email, 
    created_by,
    zapier_token,
    created_at,
    updated_at
  ) VALUES (
    user_email || '''s Business',
    user_email,
    user_email,
    'blipp_' || encode(gen_random_bytes(16), 'hex'),
    NOW(),
    NOW()
  ) RETURNING id INTO business_id;
  
  -- Create profile
  INSERT INTO public.profiles (
    id,
    email,
    business_id,
    role,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    user_email,
    business_id,
    'owner',
    NOW(),
    NOW()
  ) RETURNING id INTO profile_id;
  
  -- Create default automation templates for the business
  INSERT INTO public.automation_templates (
    business_id,
    name,
    description,
    config_json,
    is_active,
    created_at,
    updated_at
  ) VALUES 
  (
    business_id,
    'Invoice Sent - Default',
    'Default template for when invoices are sent',
    '{"triggers": ["invoice_sent"], "message": "Thank you for your business! We would love to hear about your experience. Please leave us a review!", "keywords": []}',
    true,
    NOW(),
    NOW()
  ),
  (
    business_id,
    'Invoice Paid - Default', 
    'Default template for when invoices are paid',
    '{"triggers": ["invoice_paid"], "message": "Thank you for your payment! We appreciate your business and would love a review if you have a moment.", "keywords": []}',
    true,
    NOW(),
    NOW()
  );
  
  -- Return success result
  SELECT json_build_object(
    'success', true,
    'business_id', business_id,
    'profile_id', profile_id,
    'message', 'User setup completed successfully'
  ) INTO result;
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Return error result
  SELECT json_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to setup user'
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a simple trigger that only sets created_by if it's null
CREATE OR REPLACE FUNCTION public.set_business_owner_safe()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set created_by if it's null (preserve existing values)
  IF NEW.created_by IS NULL THEN
    NEW.created_by = COALESCE(
      auth.jwt() ->> 'email',
      auth.uid()::text,
      'system'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the safe trigger
CREATE TRIGGER on_business_created_safe
  BEFORE INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_business_owner_safe();

-- 5. Update RLS policies to be more permissive for new user creation
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own business" ON public.businesses;

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (
    id = auth.uid() OR 
    email = auth.jwt() ->> 'email'
  );

CREATE POLICY "Users can insert their own business" ON public.businesses
  FOR INSERT WITH CHECK (
    created_by = auth.jwt() ->> 'email' OR
    created_by = auth.uid()::text OR
    email = auth.jwt() ->> 'email'
  );

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.setup_new_user_complete TO authenticated;
GRANT EXECUTE ON FUNCTION public.setup_new_user_complete TO anon;
