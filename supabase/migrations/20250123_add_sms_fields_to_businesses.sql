-- Add SMS configuration fields to businesses table
-- This migration adds the required fields for SMS functionality

-- Add SMS configuration columns to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS from_number TEXT,
ADD COLUMN IF NOT EXISTS surge_account_id TEXT,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'active', 'action_needed', 'disabled')),
ADD COLUMN IF NOT EXISTS last_verification_error TEXT,
ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT FALSE;

-- Add index for SMS queries
CREATE INDEX IF NOT EXISTS idx_businesses_sms_enabled ON businesses(sms_enabled);
CREATE INDEX IF NOT EXISTS idx_businesses_verification_status ON businesses(verification_status);

-- Update existing businesses to have SMS enabled if they have a phone number
UPDATE businesses 
SET sms_enabled = TRUE, 
    from_number = '+18775402797',
    verification_status = 'active'
WHERE phone IS NOT NULL AND phone != '';

-- Add comment explaining the SMS fields
COMMENT ON COLUMN businesses.from_number IS 'SMS phone number for sending messages (E.164 format)';
COMMENT ON COLUMN businesses.surge_account_id IS 'Surge API account ID for SMS sending';
COMMENT ON COLUMN businesses.verification_status IS 'SMS number verification status: pending, active, action_needed, disabled';
COMMENT ON COLUMN businesses.last_verification_error IS 'Last verification error message if verification failed';
COMMENT ON COLUMN businesses.sms_enabled IS 'Whether SMS functionality is enabled for this business';
