-- Fix review_sources table - add missing columns
-- This handles the case where the table exists but is missing some columns

-- Add missing columns to review_sources table if they don't exist
DO $$ 
BEGIN
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'review_sources' 
                   AND column_name = 'is_active' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.review_sources ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;

    -- Add last_synced_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'review_sources' 
                   AND column_name = 'last_synced_at' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.review_sources ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add sync_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'review_sources' 
                   AND column_name = 'sync_status' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.review_sources ADD COLUMN sync_status VARCHAR(50) DEFAULT 'pending';
    END IF;

    -- Add sync_error column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'review_sources' 
                   AND column_name = 'sync_error' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.review_sources ADD COLUMN sync_error TEXT;
    END IF;

    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'review_sources' 
                   AND column_name = 'created_by' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.review_sources ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'review_sources' 
                   AND column_name = 'updated_at' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.review_sources ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create indexes for review_sources if they don't exist
CREATE INDEX IF NOT EXISTS idx_review_sources_business_id ON public.review_sources(business_id);
CREATE INDEX IF NOT EXISTS idx_review_sources_platform ON public.review_sources(platform);
CREATE INDEX IF NOT EXISTS idx_review_sources_is_active ON public.review_sources(is_active);

-- Enable RLS on review_sources if not already enabled
ALTER TABLE public.review_sources ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage their own business review sources" ON public.review_sources;

-- Create RLS policy for review_sources
CREATE POLICY "Users can manage their own business review sources" ON public.review_sources
    FOR ALL USING (
        business_id IN (
            SELECT id FROM public.businesses 
            WHERE created_by = auth.uid()
        )
    );

-- Create trigger for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_review_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_review_sources_updated_at ON public.review_sources;

CREATE TRIGGER update_review_sources_updated_at 
    BEFORE UPDATE ON public.review_sources 
    FOR EACH ROW EXECUTE FUNCTION update_review_sources_updated_at();
