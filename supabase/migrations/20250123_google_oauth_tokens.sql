-- Create google_oauth_tokens table for storing Google OAuth tokens
CREATE TABLE IF NOT EXISTS public.google_oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_business_id ON public.google_oauth_tokens(business_id);
CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_user_email ON public.google_oauth_tokens(user_email);
CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_expires_at ON public.google_oauth_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.google_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own Google OAuth tokens" ON public.google_oauth_tokens;
CREATE POLICY "Users can view their own Google OAuth tokens" ON public.google_oauth_tokens
  FOR SELECT USING (
    user_email = auth.jwt() ->> 'email' OR
    business_id IN (
      SELECT id FROM public.businesses WHERE created_by = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Users can insert their own Google OAuth tokens" ON public.google_oauth_tokens;
CREATE POLICY "Users can insert their own Google OAuth tokens" ON public.google_oauth_tokens
  FOR INSERT WITH CHECK (
    user_email = auth.jwt() ->> 'email' AND
    business_id IN (
      SELECT id FROM public.businesses WHERE created_by = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Users can update their own Google OAuth tokens" ON public.google_oauth_tokens;
CREATE POLICY "Users can update their own Google OAuth tokens" ON public.google_oauth_tokens
  FOR UPDATE USING (
    user_email = auth.jwt() ->> 'email' AND
    business_id IN (
      SELECT id FROM public.businesses WHERE created_by = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Users can delete their own Google OAuth tokens" ON public.google_oauth_tokens;
CREATE POLICY "Users can delete their own Google OAuth tokens" ON public.google_oauth_tokens
  FOR DELETE USING (
    user_email = auth.jwt() ->> 'email' AND
    business_id IN (
      SELECT id FROM public.businesses WHERE created_by = auth.jwt() ->> 'email'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_google_oauth_tokens_updated_at ON public.google_oauth_tokens;
CREATE TRIGGER update_google_oauth_tokens_updated_at
    BEFORE UPDATE ON public.google_oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
