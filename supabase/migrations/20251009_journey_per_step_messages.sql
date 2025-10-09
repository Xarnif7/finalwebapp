-- Journey Per-Step Messages Migration
-- Adds support for per-step message configuration in journeys

-- Add message_purpose and message_config columns to sequence_steps table
ALTER TABLE sequence_steps 
ADD COLUMN IF NOT EXISTS message_purpose TEXT,
ADD COLUMN IF NOT EXISTS message_config JSONB DEFAULT '{}';

-- Add comment to explain the columns
COMMENT ON COLUMN sequence_steps.message_purpose IS 'Purpose of the message: thank_you, follow_up, review_request, rebooking, retention, upsell, custom';
COMMENT ON COLUMN sequence_steps.message_config IS 'Message configuration with subject, body, and variables based on channel type';

-- Create index for faster queries on message_purpose
CREATE INDEX IF NOT EXISTS idx_sequence_steps_message_purpose ON sequence_steps(message_purpose);

-- Example message_config structure:
-- For Email:
-- {
--   "purpose": "thank_you",
--   "subject": "Thank you for choosing {{business.name}}!",
--   "body": "Hi {{customer.name}}, thank you for your business...",
--   "variables": ["customer.name", "business.name", "review_link"]
-- }
--
-- For SMS:
-- {
--   "purpose": "follow_up", 
--   "body": "Hi {{customer.name}}, just checking in!",
--   "variables": ["customer.name"]
-- }

-- Update existing steps to have default custom purpose
UPDATE sequence_steps 
SET message_purpose = 'custom',
    message_config = CASE 
      WHEN kind = 'send_email' THEN jsonb_build_object(
        'purpose', 'custom',
        'subject', 'Message from your service provider',
        'body', 'Thank you for your business!'
      )
      WHEN kind = 'send_sms' THEN jsonb_build_object(
        'purpose', 'custom',
        'body', 'Thank you for your business!'
      )
      ELSE '{}'::jsonb
    END
WHERE message_purpose IS NULL AND kind IN ('send_email', 'send_sms');

