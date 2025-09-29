-- Fix the set_business_owner function to handle created_by properly
-- This resolves the "Database error saving new user" issue

CREATE OR REPLACE FUNCTION public.set_business_owner()
RETURNS TRIGGER AS $function$
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
$function$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger should already exist, but let's ensure it's properly set up
DROP TRIGGER IF EXISTS on_business_created ON public.businesses;
CREATE TRIGGER on_business_created
  BEFORE INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_business_owner();
