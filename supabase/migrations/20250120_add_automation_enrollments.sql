-- Create automation_enrollments table for tracking sequence enrollments
CREATE TABLE IF NOT EXISTS automation_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  template_id UUID REFERENCES automation_templates(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'failed')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automation_enrollments_business_id ON automation_enrollments(business_id);
CREATE INDEX IF NOT EXISTS idx_automation_enrollments_customer_id ON automation_enrollments(customer_id);
CREATE INDEX IF NOT EXISTS idx_automation_enrollments_template_id ON automation_enrollments(template_id);
CREATE INDEX IF NOT EXISTS idx_automation_enrollments_status ON automation_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_automation_enrollments_scheduled_for ON automation_enrollments(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_automation_enrollments_created_at ON automation_enrollments(created_at);

-- Enable RLS
ALTER TABLE automation_enrollments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view automation_enrollments for their business" ON automation_enrollments
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert automation_enrollments for their business" ON automation_enrollments
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update automation_enrollments for their business" ON automation_enrollments
  FOR UPDATE USING (
    business_id IN (
      SELECT business_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete automation_enrollments for their business" ON automation_enrollments
  FOR DELETE USING (
    business_id IN (
      SELECT business_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Add table comment
COMMENT ON TABLE automation_enrollments IS 'Tracks customer enrollments in automation sequences';
