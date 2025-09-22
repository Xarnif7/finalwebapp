-- Migration to enhance automation templates for message customization
-- This adds support for custom messages, AI-generated content, and better persistence

-- Add new columns to automation_templates table for enhanced message support
ALTER TABLE automation_templates 
ADD COLUMN IF NOT EXISTS custom_message TEXT,
ADD COLUMN IF NOT EXISTS message_subject TEXT,
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_ai_generation TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS message_variables JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preview_data JSONB DEFAULT '{}';

-- Create index for better performance on message queries
CREATE INDEX IF NOT EXISTS idx_automation_templates_custom_message 
ON automation_templates(business_id) 
WHERE custom_message IS NOT NULL;

-- Create index for AI-generated templates
CREATE INDEX IF NOT EXISTS idx_automation_templates_ai_generated 
ON automation_templates(business_id, ai_generated) 
WHERE ai_generated = true;

-- Update RLS policies to include new columns
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own automation templates" ON automation_templates;
DROP POLICY IF EXISTS "Users can insert their own automation templates" ON automation_templates;
DROP POLICY IF EXISTS "Users can update their own automation templates" ON automation_templates;
DROP POLICY IF EXISTS "Users can delete their own automation templates" ON automation_templates;

-- Recreate policies with email-based authentication
CREATE POLICY "Users can view their own automation templates" ON automation_templates
FOR SELECT USING (
  business_id IN (
    SELECT id FROM businesses 
    WHERE created_by = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can insert their own automation templates" ON automation_templates
FOR INSERT WITH CHECK (
  business_id IN (
    SELECT id FROM businesses 
    WHERE created_by = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can update their own automation templates" ON automation_templates
FOR UPDATE USING (
  business_id IN (
    SELECT id FROM businesses 
    WHERE created_by = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can delete their own automation templates" ON automation_templates
FOR DELETE USING (
  business_id IN (
    SELECT id FROM businesses 
    WHERE created_by = auth.jwt() ->> 'email'
  )
);

-- Create a function to update template messages
CREATE OR REPLACE FUNCTION update_automation_message(
  template_id UUID,
  custom_message TEXT,
  message_subject TEXT DEFAULT NULL,
  ai_generated BOOLEAN DEFAULT FALSE,
  message_variables JSONB DEFAULT '{}',
  preview_data JSONB DEFAULT '{}'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
  business_uuid UUID;
BEGIN
  -- Get user email from JWT
  user_email := auth.jwt() ->> 'email';
  
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Verify user owns the template
  SELECT t.business_id INTO business_uuid
  FROM automation_templates t
  JOIN businesses b ON t.business_id = b.id
  WHERE t.id = template_id
    AND b.created_by = user_email;

  IF business_uuid IS NULL THEN
    RAISE EXCEPTION 'Template not found or access denied';
  END IF;

  -- Update the template
  UPDATE automation_templates
  SET 
    custom_message = COALESCE(update_automation_message.custom_message, custom_message),
    message_subject = COALESCE(update_automation_message.message_subject, message_subject),
    ai_generated = update_automation_message.ai_generated,
    last_ai_generation = CASE 
      WHEN update_automation_message.ai_generated THEN NOW()
      ELSE last_ai_generation
    END,
    message_variables = update_automation_message.message_variables,
    preview_data = update_automation_message.preview_data,
    updated_at = NOW()
  WHERE id = template_id;

  RETURN TRUE;
END;
$$;

-- Create a function to get template with message data
CREATE OR REPLACE FUNCTION get_automation_template_with_message(template_id UUID)
RETURNS TABLE (
  id UUID,
  business_id UUID,
  name TEXT,
  description TEXT,
  trigger_type TEXT,
  channels TEXT[],
  status TEXT,
  config_json JSONB,
  custom_message TEXT,
  message_subject TEXT,
  ai_generated BOOLEAN,
  last_ai_generation TIMESTAMPTZ,
  message_variables JSONB,
  preview_data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get user email from JWT
  user_email := auth.jwt() ->> 'email';
  
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.business_id,
    t.name,
    t.description,
    t.trigger_type,
    t.channels,
    t.status,
    t.config_json,
    t.custom_message,
    t.message_subject,
    t.ai_generated,
    t.last_ai_generation,
    t.message_variables,
    t.preview_data,
    t.created_at,
    t.updated_at
  FROM automation_templates t
  JOIN businesses b ON t.business_id = b.id
  WHERE t.id = template_id
    AND b.created_by = user_email;
END;
$$;

-- Create a function to get all templates for a business with message data
CREATE OR REPLACE FUNCTION get_business_automation_templates(business_uuid UUID)
RETURNS TABLE (
  id UUID,
  business_id UUID,
  name TEXT,
  description TEXT,
  trigger_type TEXT,
  channels TEXT[],
  status TEXT,
  config_json JSONB,
  custom_message TEXT,
  message_subject TEXT,
  ai_generated BOOLEAN,
  last_ai_generation TIMESTAMPTZ,
  message_variables JSONB,
  preview_data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get user email from JWT
  user_email := auth.jwt() ->> 'email';
  
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Verify user owns the business
  IF NOT EXISTS (
    SELECT 1 FROM businesses 
    WHERE id = business_uuid 
      AND created_by = user_email
  ) THEN
    RAISE EXCEPTION 'Business not found or access denied';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.business_id,
    t.name,
    t.description,
    t.trigger_type,
    t.channels,
    t.status,
    t.config_json,
    t.custom_message,
    t.message_subject,
    t.ai_generated,
    t.last_ai_generation,
    t.message_variables,
    t.preview_data,
    t.created_at,
    t.updated_at
  FROM automation_templates t
  WHERE t.business_id = business_uuid
  ORDER BY t.created_at DESC;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_automation_message(UUID, TEXT, TEXT, BOOLEAN, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_automation_template_with_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_automation_templates(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN automation_templates.custom_message IS 'Custom message content for the automation';
COMMENT ON COLUMN automation_templates.message_subject IS 'Email subject line for the automation';
COMMENT ON COLUMN automation_templates.ai_generated IS 'Whether the message was generated by AI';
COMMENT ON COLUMN automation_templates.last_ai_generation IS 'Timestamp of last AI generation';
COMMENT ON COLUMN automation_templates.message_variables IS 'Variables used in the message template';
COMMENT ON COLUMN automation_templates.preview_data IS 'Sample data for message preview';

COMMENT ON FUNCTION update_automation_message IS 'Updates automation template message data with security checks';
COMMENT ON FUNCTION get_automation_template_with_message IS 'Retrieves automation template with message data';
COMMENT ON FUNCTION get_business_automation_templates IS 'Retrieves all automation templates for a business with message data';
