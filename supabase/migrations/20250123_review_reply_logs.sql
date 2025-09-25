-- Create review reply logs table
CREATE TABLE IF NOT EXISTS public.review_reply_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    review_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    reply_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'posted', 'failed'
    error_message TEXT,
    posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.review_reply_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own reply logs" ON public.review_reply_logs;
CREATE POLICY "Users can view their own reply logs" ON public.review_reply_logs
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert their own reply logs" ON public.review_reply_logs;
CREATE POLICY "Users can insert their own reply logs" ON public.review_reply_logs
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_review_reply_logs_business_id ON public.review_reply_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_review_reply_logs_review_id ON public.review_reply_logs(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reply_logs_platform ON public.review_reply_logs(platform);
CREATE INDEX IF NOT EXISTS idx_review_reply_logs_status ON public.review_reply_logs(status);
