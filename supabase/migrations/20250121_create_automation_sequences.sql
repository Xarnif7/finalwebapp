-- Create automation_sequences table for active sequences
CREATE TABLE IF NOT EXISTS automation_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  template_id UUID REFERENCES automation_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('event', 'date_based')),
  channels TEXT[] NOT NULL DEFAULT '{}',
  config_json JSONB DEFAULT '{}',
  rate_per_hour INTEGER DEFAULT 50,
  rate_per_day INTEGER DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automation_sequences_business_id ON automation_sequences(business_id);
CREATE INDEX IF NOT EXISTS idx_automation_sequences_template_id ON automation_sequences(template_id);
CREATE INDEX IF NOT EXISTS idx_automation_sequences_status ON automation_sequences(status);
CREATE INDEX IF NOT EXISTS idx_automation_sequences_key ON automation_sequences(business_id, key);

-- Enable RLS
ALTER TABLE automation_sequences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (updated for email-based created_by)
CREATE POLICY "Users can view their automation sequences" ON automation_sequences
FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert their automation sequences" ON automation_sequences
FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can update their automation sequences" ON automation_sequences
FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete their automation sequences" ON automation_sequences
FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));
