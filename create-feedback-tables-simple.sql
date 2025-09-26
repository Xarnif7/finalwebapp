-- Create only the missing tables and policies for feedback collection
-- Run this in your Supabase SQL editor

-- 1. Create private_feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.private_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    review_request_id UUID NOT NULL REFERENCES public.review_requests(id) ON DELETE CASCADE,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    message TEXT,
    category TEXT DEFAULT 'general_experience',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add RLS policy for private_feedback table
CREATE POLICY "Users can view private feedback for their business" ON public.private_feedback
    FOR ALL USING (
        review_request_id IN (
            SELECT id FROM public.review_requests 
            WHERE business_id IN (
                SELECT business_id FROM public.profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

-- 3. Add anonymous access policy for review_requests (for feedback collection)
CREATE POLICY "Anonymous users can read review requests by ID" ON public.review_requests
    FOR SELECT USING (true);

-- 4. Create update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Create trigger for private_feedback table
CREATE TRIGGER update_private_feedback_updated_at 
    BEFORE UPDATE ON public.private_feedback 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. Insert default templates if they don't exist
INSERT INTO public.templates (business_id, name, type, subject, content, is_default, created_at)
SELECT 
    p.business_id,
    'Feedback Collection Email',
    'email',
    'How was your experience with {company_name}?',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>How was your experience?</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with gradient -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Thank You!</h1>
            <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">We''d love to hear about your experience</p>
        </div>
        
        <!-- Main content -->
        <div style="padding: 40px 20px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi {customer.first_name} {customer.last_name},
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                We hope you had a great experience with {company_name}! Your feedback helps us improve our service and helps other customers find us.
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="{review_link}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Leave Feedback
                </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                This should only take a minute and helps us serve you better.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
                © 2024 {company_name}. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>',
    true,
    NOW()
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.templates t 
    WHERE t.business_id = p.business_id 
    AND t.name = 'Feedback Collection Email'
);

-- 7. Insert default SMS template if it doesn't exist
INSERT INTO public.templates (business_id, name, type, subject, content, is_default, created_at)
SELECT 
    p.business_id,
    'Feedback Collection SMS',
    'sms',
    '',
    'Hi {customer.first_name}! How was your experience with {company_name}? Leave feedback: {review_link}',
    true,
    NOW()
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.templates t 
    WHERE t.business_id = p.business_id 
    AND t.name = 'Feedback Collection SMS'
);
