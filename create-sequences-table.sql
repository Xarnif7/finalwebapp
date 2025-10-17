-- Create sequences table for Blipp MVP
-- Run this in your Supabase SQL Editor

-- Create sequences table
CREATE TABLE IF NOT EXISTS sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'draft')),
  trigger_event_type TEXT,
  allow_manual_enroll BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  rate_per_hour INTEGER DEFAULT 100,
  rate_per_day INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sequence_steps table
CREATE TABLE IF NOT EXISTS sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('send_email', 'send_sms', 'wait', 'branch')),
  step_index INTEGER NOT NULL,
  wait_ms INTEGER,
  template_id UUID,
  message_purpose TEXT,
  message_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sequences
CREATE POLICY "Users can view their sequences" ON sequences
FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert their sequences" ON sequences
FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can update their sequences" ON sequences
FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete their sequences" ON sequences
FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

-- Create RLS policies for sequence_steps
CREATE POLICY "Users can view their sequence steps" ON sequence_steps
FOR SELECT USING (sequence_id IN (SELECT id FROM sequences WHERE business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email')));

CREATE POLICY "Users can insert their sequence steps" ON sequence_steps
FOR INSERT WITH CHECK (sequence_id IN (SELECT id FROM sequences WHERE business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email')));

CREATE POLICY "Users can update their sequence steps" ON sequence_steps
FOR UPDATE USING (sequence_id IN (SELECT id FROM sequences WHERE business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email')));

CREATE POLICY "Users can delete their sequence steps" ON sequence_steps
FOR DELETE USING (sequence_id IN (SELECT id FROM sequences WHERE business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email')));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sequences_business_id ON sequences(business_id);
CREATE INDEX IF NOT EXISTS idx_sequences_status ON sequences(status);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence_id ON sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_step_index ON sequence_steps(sequence_id, step_index);

-- Test the tables
SELECT 'Sequences table created successfully' as status;
SELECT 'Sequence steps table created successfully' as status;
