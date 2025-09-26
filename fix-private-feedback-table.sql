-- Fix the private_feedback table by adding the missing rating column
-- Run this in your Supabase SQL editor

-- 1. Add the missing rating column to private_feedback table
ALTER TABLE public.private_feedback 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- 2. Add the missing message column if it doesn't exist
ALTER TABLE public.private_feedback 
ADD COLUMN IF NOT EXISTS message TEXT;

-- 3. Add the missing category column if it doesn't exist
ALTER TABLE public.private_feedback 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general_experience';

-- 4. Add the missing updated_at column if it doesn't exist
ALTER TABLE public.private_feedback 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Create the update trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create trigger for private_feedback table if it doesn't exist
DROP TRIGGER IF EXISTS update_private_feedback_updated_at ON public.private_feedback;
CREATE TRIGGER update_private_feedback_updated_at 
    BEFORE UPDATE ON public.private_feedback 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
