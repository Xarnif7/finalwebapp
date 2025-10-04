-- Add AI timing optimization fields to automation sequences
ALTER TABLE automation_sequences 
ADD COLUMN IF NOT EXISTS ai_timing_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_timing_data JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS optimal_timing_confidence INTEGER DEFAULT NULL;

-- Add AI timing fields to scheduled jobs for tracking
ALTER TABLE scheduled_jobs
ADD COLUMN IF NOT EXISTS ai_optimized BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_confidence INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_timing_data JSONB DEFAULT NULL;

-- Create automation_logs table for AI analysis (if not exists)
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES automation_sequences(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  trigger_type TEXT NOT NULL,
  delay_hours INTEGER,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  open_rate DECIMAL(5,2),
  click_rate DECIMAL(5,2),
  response_rate DECIMAL(5,2),
  ai_optimized BOOLEAN DEFAULT FALSE,
  ai_confidence INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_automation_logs_business_channel 
ON automation_logs(business_id, channel);

CREATE INDEX IF NOT EXISTS idx_automation_logs_sent_at 
ON automation_logs(sent_at);

-- Add RLS policies for automation_logs
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view logs for their business
CREATE POLICY "Users can view automation logs for their business" ON automation_logs
FOR SELECT USING (
  business_id IN (
    SELECT id FROM businesses 
    WHERE owner_id = auth.uid() OR created_by = auth.jwt() ->> 'email'
  )
);

-- Policy: Service role can insert logs
CREATE POLICY "Service role can insert automation logs" ON automation_logs
FOR INSERT WITH CHECK (true);

-- Policy: Service role can update logs
CREATE POLICY "Service role can update automation logs" ON automation_logs
FOR UPDATE USING (true);

-- Create function to update automation_logs updated_at
CREATE OR REPLACE FUNCTION update_automation_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automation_logs
DROP TRIGGER IF EXISTS trigger_update_automation_logs_updated_at ON automation_logs;
CREATE TRIGGER trigger_update_automation_logs_updated_at
  BEFORE UPDATE ON automation_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_logs_updated_at();

-- Add comment
COMMENT ON TABLE automation_logs IS 'Logs automation sends for AI timing optimization analysis';
COMMENT ON COLUMN automation_logs.ai_optimized IS 'Whether this send was AI-optimized';
COMMENT ON COLUMN automation_logs.ai_confidence IS 'AI confidence score (0-100) for timing optimization';
COMMENT ON COLUMN automation_logs.delay_hours IS 'Hours delayed from trigger to send';
