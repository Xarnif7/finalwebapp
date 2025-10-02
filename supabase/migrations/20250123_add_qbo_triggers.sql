-- Add QBO trigger support to automation templates
-- This migration adds comprehensive QuickBooks Online trigger support

-- Add qbo_triggers column to automation_templates table
ALTER TABLE automation_templates 
ADD COLUMN IF NOT EXISTS qbo_triggers JSONB DEFAULT '{}';

-- Create index for QBO trigger queries
CREATE INDEX IF NOT EXISTS idx_automation_templates_qbo_triggers 
ON automation_templates USING GIN (qbo_triggers);

-- Add comment for documentation
COMMENT ON COLUMN automation_templates.qbo_triggers IS 'JSON object containing enabled QBO triggers for this template';

-- Create a function to get templates by QBO trigger
CREATE OR REPLACE FUNCTION get_templates_by_qbo_trigger(
  business_uuid UUID,
  trigger_name TEXT
)
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
  qbo_triggers JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
    t.qbo_triggers,
    t.created_at,
    t.updated_at
  FROM automation_templates t
  WHERE t.business_id = business_uuid
    AND t.status IN ('active', 'ready')
    AND (
      t.qbo_triggers IS NULL 
      OR t.qbo_triggers = '{}'::jsonb
      OR t.qbo_triggers ? trigger_name
      OR (t.qbo_triggers ->> trigger_name)::boolean = true
    )
  ORDER BY t.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_templates_by_qbo_trigger(UUID, TEXT) TO authenticated;

-- Add comment for the function
COMMENT ON FUNCTION get_templates_by_qbo_trigger IS 'Get automation templates that are enabled for a specific QBO trigger';
