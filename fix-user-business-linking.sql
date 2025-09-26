-- Fix user business linking issue
-- This script ensures all users have a business_id linked to their profile

-- First, let's see which users don't have business_id
SELECT 
    p.user_id,
    p.business_id,
    u.email
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.business_id IS NULL;

-- Create businesses for users without business_id
INSERT INTO businesses (name, website, created_at, updated_at)
SELECT 
    'My Business',
    NULL,
    NOW(),
    NOW()
FROM profiles p
WHERE p.business_id IS NULL;

-- Link the newly created businesses to profiles
UPDATE profiles 
SET business_id = b.id
FROM businesses b
WHERE profiles.business_id IS NULL 
  AND b.name = 'My Business'
  AND b.created_at > NOW() - INTERVAL '1 minute';

-- Verify the fix
SELECT 
    p.user_id,
    p.business_id,
    b.name as business_name,
    u.email
FROM profiles p
LEFT JOIN businesses b ON p.business_id = b.id
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.business_id IS NOT NULL;
