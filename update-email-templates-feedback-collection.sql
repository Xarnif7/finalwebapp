-- Update existing email templates to use feedback collection flow
-- Run this in your Supabase SQL editor

-- Update existing email templates to use new feedback collection wording
UPDATE public.templates 
SET 
  subject = 'How was your experience with {company_name}?',
  body = 'Hi {customer.name},

Thank you for choosing {company_name}! We''d love to hear about your experience.

Please take a moment to share your feedback:
{review_link}

Your feedback helps us improve and serve our customers better.

Best regards,
{company_name}',
  updated_at = NOW()
WHERE kind = 'email' 
AND (subject = 'We''d love your feedback!' OR subject IS NULL);

-- Update existing SMS templates
UPDATE public.templates 
SET 
  body = 'Hi {customer.name}! Thanks for choosing {company_name}. How was your experience? Share feedback: {review_link}',
  updated_at = NOW()
WHERE kind = 'sms' 
AND (body LIKE '%We''d love your feedback%' OR body LIKE '%review%');

-- Create default templates for businesses that don't have any yet
INSERT INTO public.templates (business_id, kind, subject, body)
SELECT DISTINCT 
    p.business_id,
    'email',
    'How was your experience with {company_name}?',
    'Hi {customer.name},

Thank you for choosing {company_name}! We''d love to hear about your experience.

Please take a moment to share your feedback:
{review_link}

Your feedback helps us improve and serve our customers better.

Best regards,
{company_name}'
FROM public.profiles p
WHERE p.business_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.templates t 
    WHERE t.business_id = p.business_id AND t.kind = 'email'
);

INSERT INTO public.templates (business_id, kind, body)
SELECT DISTINCT 
    p.business_id,
    'sms',
    'Hi {customer.name}! Thanks for choosing {company_name}. How was your experience? Share feedback: {review_link}'
FROM public.profiles p
WHERE p.business_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.templates t 
    WHERE t.business_id = p.business_id AND t.kind = 'sms'
);
