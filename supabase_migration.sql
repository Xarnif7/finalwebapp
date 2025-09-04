-- First, let's check if the profiles table has the right structure
-- If business_id doesn't exist or isn't unique, we'll need to fix it

-- Check if business_id column exists in profiles table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'business_id'
    ) THEN
        -- Add business_id column if it doesn't exist
        ALTER TABLE public.profiles ADD COLUMN business_id UUID DEFAULT gen_random_uuid();
        
        -- Update existing rows to have unique business_ids
        UPDATE public.profiles SET business_id = gen_random_uuid() WHERE business_id IS NULL;
        
        -- Make business_id NOT NULL
        ALTER TABLE public.profiles ALTER COLUMN business_id SET NOT NULL;
        
        -- Add unique constraint
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_business_id_unique UNIQUE (business_id);
        
        RAISE NOTICE 'Added business_id column to profiles table';
    END IF;
END $$;

-- Ensure full_name exists on profiles for UI usage
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
        RAISE NOTICE 'Added full_name column to profiles table';
    END IF;
END $$;

-- Enable RLS on profiles and add self-access policies if missing
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'profiles' 
          AND policyname = 'Profiles select own row'
    ) THEN
        CREATE POLICY "Profiles select own row" ON public.profiles
        FOR SELECT USING (id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'profiles' 
          AND policyname = 'Profiles update own row'
    ) THEN
        CREATE POLICY "Profiles update own row" ON public.profiles
        FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
    END IF;
END $$;

-- Create review_sources table (without foreign key initially)
CREATE TABLE IF NOT EXISTS public.review_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('google', 'facebook', 'yelp')),
    public_url TEXT NOT NULL,
    external_id TEXT NOT NULL,
    connection_type TEXT NOT NULL DEFAULT 'api_key',
    access_token TEXT,
    refresh_token TEXT,
    connected BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reviews table (without foreign key initially)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('google', 'facebook', 'yelp')),
    external_review_id TEXT NOT NULL,
    reviewer_name TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    text TEXT,
    review_url TEXT,
    review_created_at TIMESTAMPTZ,
    reply_text TEXT,
    reply_posted_at TIMESTAMPTZ,
    is_replied BOOLEAN DEFAULT false,
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_sources_business_id ON public.review_sources(business_id);
CREATE INDEX IF NOT EXISTS idx_review_sources_platform ON public.review_sources(platform);
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON public.reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_platform ON public.reviews(platform);
CREATE INDEX IF NOT EXISTS idx_reviews_external_id ON public.reviews(external_review_id);

-- Create unique constraint for business + platform combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_sources_business_platform ON public.review_sources(business_id, platform);

-- Enable Row Level Security
ALTER TABLE public.review_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies for review_sources
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname='public' AND tablename='review_sources' 
          AND policyname='Users can view their own review sources') THEN
        CREATE POLICY "Users can view their own review sources" ON public.review_sources
            FOR SELECT USING (
                business_id IN (
                    SELECT business_id FROM public.profiles WHERE id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname='public' AND tablename='review_sources' 
          AND policyname='Users can insert their own review sources') THEN
        CREATE POLICY "Users can insert their own review sources" ON public.review_sources
            FOR INSERT WITH CHECK (
                business_id IN (
                    SELECT business_id FROM public.profiles WHERE id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname='public' AND tablename='review_sources' 
          AND policyname='Users can update their own review sources') THEN
        CREATE POLICY "Users can update their own review sources" ON public.review_sources
            FOR UPDATE USING (
                business_id IN (
                    SELECT business_id FROM public.profiles WHERE id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname='public' AND tablename='review_sources' 
          AND policyname='Users can delete their own review sources') THEN
        CREATE POLICY "Users can delete their own review sources" ON public.review_sources
            FOR DELETE USING (
                business_id IN (
                    SELECT business_id FROM public.profiles WHERE id = auth.uid()
                )
            );
    END IF;
END $$;

-- Idempotent RLS Policies for reviews
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname='public' AND tablename='reviews' 
          AND policyname='Users can view their own reviews') THEN
        CREATE POLICY "Users can view their own reviews" ON public.reviews
            FOR SELECT USING (
                business_id IN (
                    SELECT business_id FROM public.profiles WHERE id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname='public' AND tablename='reviews' 
          AND policyname='Users can insert their own reviews') THEN
        CREATE POLICY "Users can insert their own reviews" ON public.reviews
            FOR INSERT WITH CHECK (
                business_id IN (
                    SELECT business_id FROM public.profiles WHERE id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname='public' AND tablename='reviews' 
          AND policyname='Users can update their own reviews') THEN
        CREATE POLICY "Users can update their own reviews" ON public.reviews
            FOR UPDATE USING (
                business_id IN (
                    SELECT business_id FROM public.profiles WHERE id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname='public' AND tablename='reviews' 
          AND policyname='Users can delete their own reviews') THEN
        CREATE POLICY "Users can delete their own reviews" ON public.reviews
            FOR DELETE USING (
                business_id IN (
                    SELECT business_id FROM public.profiles WHERE id = auth.uid()
                )
            );
    END IF;
END $$;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'review_sources' AND t.tgname = 'set_review_sources_updated_at'
    ) THEN
        CREATE TRIGGER set_review_sources_updated_at
            BEFORE UPDATE ON public.review_sources
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'reviews' AND t.tgname = 'set_reviews_updated_at'
    ) THEN
        CREATE TRIGGER set_reviews_updated_at
            BEFORE UPDATE ON public.reviews
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;

-- Now add foreign key constraints if possible
DO $$
BEGIN
    -- Try to add foreign key constraint for review_sources
    BEGIN
        ALTER TABLE public.review_sources 
        ADD CONSTRAINT review_sources_business_id_fkey 
        FOREIGN KEY (business_id) REFERENCES public.profiles(business_id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to review_sources';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add foreign key constraint to review_sources: %', SQLERRM;
    END;
    
    -- Try to add foreign key constraint for reviews
    BEGIN
        ALTER TABLE public.reviews 
        ADD CONSTRAINT reviews_business_id_fkey 
        FOREIGN KEY (business_id) REFERENCES public.profiles(business_id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to reviews';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add foreign key constraint to reviews: %', SQLERRM;
    END;
END $$;
