-- Add description column to automation_templates table
ALTER TABLE automation_templates ADD COLUMN IF NOT EXISTS description TEXT;

-- Update RLS policies to include description column
DROP POLICY IF EXISTS "Users can view their own automation templates" ON automation_templates;
DROP POLICY IF EXISTS "Users can insert their own automation templates" ON automation_templates;
DROP POLICY IF EXISTS "Users can update their own automation templates" ON automation_templates;
DROP POLICY IF EXISTS "Users can delete their own automation templates" ON automation_templates;

-- Recreate policies with email-based authentication including description
CREATE POLICY "Users can view their own automation templates" ON automation_templates
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = automation_templates.business_id 
    AND businesses.created_by = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can insert their own automation templates" ON automation_templates
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = automation_templates.business_id 
    AND businesses.created_by = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can update their own automation templates" ON automation_templates
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = automation_templates.business_id 
    AND businesses.created_by = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can delete their own automation templates" ON automation_templates
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = automation_templates.business_id 
    AND businesses.created_by = auth.jwt() ->> 'email'
  )
);
