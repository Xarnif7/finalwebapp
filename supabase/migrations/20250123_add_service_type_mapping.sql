-- Add service type mapping to automation templates
ALTER TABLE automation_templates 
ADD COLUMN IF NOT EXISTS service_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trigger_events TEXT[] DEFAULT '{"manual"}';

-- Add comments
COMMENT ON COLUMN automation_templates.service_types IS 'Array of service types this template should handle (e.g., ["Lawn Care", "Sprinkler Repair"])';
COMMENT ON COLUMN automation_templates.is_default IS 'Whether this is the default template for unmatched service types';
COMMENT ON COLUMN automation_templates.trigger_events IS 'Array of trigger events this template responds to (e.g., ["manual", "jobber_job_completed"])';

-- Create index for service type lookups
CREATE INDEX IF NOT EXISTS idx_automation_templates_service_types ON automation_templates USING GIN(service_types);
CREATE INDEX IF NOT EXISTS idx_automation_templates_trigger_events ON automation_templates USING GIN(trigger_events);
CREATE INDEX IF NOT EXISTS idx_automation_templates_is_default ON automation_templates(is_default);

-- Update existing templates to have default trigger events
UPDATE automation_templates 
SET trigger_events = ARRAY['manual', 'jobber_job_completed']::TEXT[]
WHERE trigger_events IS NULL OR array_length(trigger_events, 1) IS NULL;

-- Function to find the best matching template for a service type
CREATE OR REPLACE FUNCTION find_template_for_service_type(
  p_business_id UUID,
  p_service_type TEXT,
  p_trigger_event TEXT DEFAULT 'jobber_job_completed'
)
RETURNS TABLE(
  template_id UUID,
  template_name TEXT,
  template_config JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    at.id,
    at.name,
    at.config_json
  FROM automation_templates at
  WHERE at.business_id = p_business_id
    AND at.status = 'active'
    AND at.trigger_events @> ARRAY[p_trigger_event]
    AND (
      -- Exact service type match
      at.service_types @> ARRAY[p_service_type]
      OR
      -- Partial service type match (case insensitive)
      EXISTS (
        SELECT 1 FROM unnest(at.service_types) AS st
        WHERE LOWER(st) LIKE LOWER('%' || p_service_type || '%')
           OR LOWER(p_service_type) LIKE LOWER('%' || st || '%')
      )
      OR
      -- Default template fallback
      (at.is_default = TRUE AND NOT EXISTS (
        SELECT 1 FROM automation_templates at2
        WHERE at2.business_id = p_business_id
          AND at2.status = 'active'
          AND at2.trigger_events @> ARRAY[p_trigger_event]
          AND (at2.service_types @> ARRAY[p_service_type] OR at2.is_default = FALSE)
      ))
    )
  ORDER BY 
    -- Prioritize exact matches
    CASE WHEN at.service_types @> ARRAY[p_service_type] THEN 1 ELSE 2 END,
    -- Then partial matches
    CASE WHEN EXISTS (
      SELECT 1 FROM unnest(at.service_types) AS st
      WHERE LOWER(st) LIKE LOWER('%' || p_service_type || '%')
         OR LOWER(p_service_type) LIKE LOWER('%' || st || '%')
    ) THEN 1 ELSE 2 END,
    -- Then default templates
    at.is_default DESC,
    -- Finally by creation date
    at.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_template_for_service_type TO authenticated;
