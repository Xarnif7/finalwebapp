-- Create feedback form settings table
-- Run this in your Supabase SQL editor

-- Create feedback form settings table
CREATE TABLE IF NOT EXISTS public.feedback_form_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one settings record per business
    UNIQUE(business_id)
);

-- Enable RLS
ALTER TABLE public.feedback_form_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own feedback form settings" ON public.feedback_form_settings
    FOR ALL USING (
        business_id IN (
            SELECT business_id FROM public.profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Create update trigger
CREATE OR REPLACE FUNCTION update_feedback_form_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feedback_form_settings_updated_at 
    BEFORE UPDATE ON public.feedback_form_settings 
    FOR EACH ROW EXECUTE FUNCTION update_feedback_form_settings_updated_at();
