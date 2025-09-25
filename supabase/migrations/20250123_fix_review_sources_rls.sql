-- Fix RLS policies for review_sources table to allow proper access

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own review sources" ON public.review_sources;
DROP POLICY IF EXISTS "Users can insert their own review sources" ON public.review_sources;
DROP POLICY IF EXISTS "Users can update their own review sources" ON public.review_sources;
DROP POLICY IF EXISTS "Users can delete their own review sources" ON public.review_sources;

-- Enable RLS on review_sources table
ALTER TABLE public.review_sources ENABLE ROW LEVEL SECURITY;

-- Create new policies that allow users to access review_sources for their business
CREATE POLICY "Users can view review sources for their business" ON public.review_sources
  FOR SELECT USING (
    business_id IN (
      SELECT business_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert review sources for their business" ON public.review_sources
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update review sources for their business" ON public.review_sources
  FOR UPDATE USING (
    business_id IN (
      SELECT business_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete review sources for their business" ON public.review_sources
  FOR DELETE USING (
    business_id IN (
      SELECT business_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Also fix RLS policies for reviews table to ensure consistency
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;

-- Enable RLS on reviews table
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create new policies for reviews table
CREATE POLICY "Users can view reviews for their business" ON public.reviews
  FOR SELECT USING (
    business_id IN (
      SELECT business_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reviews for their business" ON public.reviews
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update reviews for their business" ON public.reviews
  FOR UPDATE USING (
    business_id IN (
      SELECT business_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete reviews for their business" ON public.reviews
  FOR DELETE USING (
    business_id IN (
      SELECT business_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );
