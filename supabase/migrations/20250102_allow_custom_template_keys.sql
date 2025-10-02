-- Migration: Allow custom template keys for dynamic templates
-- Created: 2025-01-02
-- Description: Modifies automation_template_key enum to allow custom keys for dynamic templates

-- First, we need to alter the column to allow any text value
-- This requires dropping the enum constraint and changing to TEXT

-- Step 1: Drop the existing constraint
ALTER TABLE automation_templates DROP CONSTRAINT IF EXISTS automation_templates_key_check;

-- Step 2: Change the column type from enum to text
ALTER TABLE automation_templates ALTER COLUMN key TYPE TEXT;

-- Step 3: Drop the enum type (optional, but clean)
DROP TYPE IF EXISTS automation_template_key;

-- Step 4: Add a check constraint to ensure key is not empty
ALTER TABLE automation_templates ADD CONSTRAINT automation_templates_key_not_empty 
CHECK (key IS NOT NULL AND length(trim(key)) > 0);

-- Step 5: Update existing templates to have more descriptive keys
UPDATE automation_templates 
SET key = 'job_completed_default' 
WHERE key = 'job_completed' AND name != 'Job Completed';

UPDATE automation_templates 
SET key = 'invoice_paid_default' 
WHERE key = 'invoice_paid' AND name != 'Invoice Paid';

UPDATE automation_templates 
SET key = 'service_reminder_default' 
WHERE key = 'service_reminder' AND name != 'Service Reminder';

-- Step 6: Create a unique index on (business_id, key) to maintain uniqueness per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_templates_business_key_unique 
ON automation_templates(business_id, key);
