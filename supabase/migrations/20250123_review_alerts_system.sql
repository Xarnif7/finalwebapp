-- Create review alert settings table
CREATE TABLE IF NOT EXISTS public.review_alert_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT false,
    negative_threshold INTEGER DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(business_id)
);

-- Create review alerts log table
CREATE TABLE IF NOT EXISTS public.review_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    review_id TEXT NOT NULL,
    alert_type TEXT NOT NULL DEFAULT 'negative_review',
    rating INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.review_alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for review_alert_settings
DROP POLICY IF EXISTS "Users can view their own alert settings" ON public.review_alert_settings;
CREATE POLICY "Users can view their own alert settings" ON public.review_alert_settings
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own alert settings" ON public.review_alert_settings;
CREATE POLICY "Users can update their own alert settings" ON public.review_alert_settings
    FOR ALL USING (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Create RLS policies for review_alerts
DROP POLICY IF EXISTS "Users can view their own alerts" ON public.review_alerts;
CREATE POLICY "Users can view their own alerts" ON public.review_alerts
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert their own alerts" ON public.review_alerts;
CREATE POLICY "Users can insert their own alerts" ON public.review_alerts
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_review_alert_settings_business_id ON public.review_alert_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_review_alerts_business_id ON public.review_alerts(business_id);
CREATE INDEX IF NOT EXISTS idx_review_alerts_created_at ON public.review_alerts(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS review_alert_settings_updated_at ON public.review_alert_settings;
CREATE TRIGGER review_alert_settings_updated_at
    BEFORE UPDATE ON public.review_alert_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
