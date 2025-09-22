-- Create table to track automation executions
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES automation_sequences(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  message_id TEXT,
  recipient_email TEXT,
  recipient_phone TEXT,
  error_message TEXT,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automation_logs_business_id ON automation_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_customer_id ON automation_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_sequence_id ON automation_logs(sequence_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_status ON automation_logs(status);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON automation_logs(created_at);

-- Enable RLS
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (updated for email-based created_by)
CREATE POLICY "Users can view their automation logs" ON automation_logs
FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert their automation logs" ON automation_logs
FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can update their automation logs" ON automation_logs
FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete their automation logs" ON automation_logs
FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));
