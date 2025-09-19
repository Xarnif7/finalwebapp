-- AUTOMATION SCHEMA MIGRATION
-- Run this SQL in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SEQUENCES table
CREATE TABLE IF NOT EXISTS sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 2. SEQUENCE_STEPS table
CREATE TABLE IF NOT EXISTS sequence_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('send_email', 'send_sms', 'wait', 'branch')),
    step_index INTEGER NOT NULL,
    wait_ms INTEGER,
    template_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SEQUENCE_ENROLLMENTS table
CREATE TABLE IF NOT EXISTS sequence_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('active', 'finished', 'stopped')),
    current_step_index INTEGER DEFAULT 0,
    next_run_at TIMESTAMPTZ,
    last_event_at TIMESTAMPTZ,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MESSAGE_TEMPLATES table
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
    name TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MESSAGES table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
    template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
    sequence_id UUID REFERENCES sequences(id) ON DELETE SET NULL,
    enrollment_id UUID REFERENCES sequence_enrollments(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
    provider_message_id TEXT,
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AUTOMATION_LOGS table
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
    source TEXT NOT NULL CHECK (source IN ('trigger', 'scheduler', 'sender')),
    sequence_id UUID REFERENCES sequences(id) ON DELETE SET NULL,
    enrollment_id UUID REFERENCES sequence_enrollments(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add useful indexes for performance
CREATE INDEX IF NOT EXISTS idx_sequences_business_id ON sequences(business_id);
CREATE INDEX IF NOT EXISTS idx_sequences_status ON sequences(status);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence_id ON sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence_step ON sequence_steps(sequence_id, step_index);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_business_id ON sequence_enrollments(business_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_sequence_id ON sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_customer_id ON sequence_enrollments(customer_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_next_run_at ON sequence_enrollments(next_run_at);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_status ON sequence_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_message_templates_business_id ON message_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_channel ON message_templates(channel);
CREATE INDEX IF NOT EXISTS idx_messages_business_id ON messages(business_id);
CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_sequence_id ON messages(sequence_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_scheduled_for ON messages(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_automation_logs_business_id ON automation_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_level ON automation_logs(level);
CREATE INDEX IF NOT EXISTS idx_automation_logs_source ON automation_logs(source);
CREATE INDEX IF NOT EXISTS idx_automation_logs_sequence_id ON automation_logs(sequence_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON automation_logs(created_at);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sequences
CREATE POLICY "Users can view sequences for their business" ON sequences
    FOR SELECT USING (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert sequences for their business" ON sequences
    FOR INSERT WITH CHECK (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update sequences for their business" ON sequences
    FOR UPDATE USING (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete sequences for their business" ON sequences
    FOR DELETE USING (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

-- Create RLS policies for sequence_steps
CREATE POLICY "Users can view sequence_steps for their business" ON sequence_steps
    FOR SELECT USING (sequence_id IN (
        SELECT s.id FROM sequences s
        JOIN profiles p ON s.business_id = p.business_id
        WHERE p.id = auth.uid()
    ));

CREATE POLICY "Users can insert sequence_steps for their business" ON sequence_steps
    FOR INSERT WITH CHECK (sequence_id IN (
        SELECT s.id FROM sequences s
        JOIN profiles p ON s.business_id = p.business_id
        WHERE p.id = auth.uid()
    ));

CREATE POLICY "Users can update sequence_steps for their business" ON sequence_steps
    FOR UPDATE USING (sequence_id IN (
        SELECT s.id FROM sequences s
        JOIN profiles p ON s.business_id = p.business_id
        WHERE p.id = auth.uid()
    ));

CREATE POLICY "Users can delete sequence_steps for their business" ON sequence_steps
    FOR DELETE USING (sequence_id IN (
        SELECT s.id FROM sequences s
        JOIN profiles p ON s.business_id = p.business_id
        WHERE p.id = auth.uid()
    ));

-- Create RLS policies for sequence_enrollments
CREATE POLICY "Users can view sequence_enrollments for their business" ON sequence_enrollments
    FOR SELECT USING (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert sequence_enrollments for their business" ON sequence_enrollments
    FOR INSERT WITH CHECK (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update sequence_enrollments for their business" ON sequence_enrollments
    FOR UPDATE USING (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete sequence_enrollments for their business" ON sequence_enrollments
    FOR DELETE USING (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

-- Create RLS policies for message_templates
CREATE POLICY "Users can view message_templates for their business" ON message_templates
    FOR SELECT USING (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert message_templates for their business" ON message_templates
    FOR INSERT WITH CHECK (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update message_templates for their business" ON message_templates
    FOR UPDATE USING (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete message_templates for their business" ON message_templates
    FOR DELETE USING (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

-- Create RLS policies for messages
CREATE POLICY "Users can view messages for their business" ON messages
    FOR SELECT USING (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert messages for their business" ON messages
    FOR INSERT WITH CHECK (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update messages for their business" ON messages
    FOR UPDATE USING (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete messages for their business" ON messages
    FOR DELETE USING (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

-- Create RLS policies for automation_logs
CREATE POLICY "Users can view automation_logs for their business" ON automation_logs
    FOR SELECT USING (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert automation_logs for their business" ON automation_logs
    FOR INSERT WITH CHECK (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update automation_logs for their business" ON automation_logs
    FOR UPDATE USING (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete automation_logs for their business" ON automation_logs
    FOR DELETE USING (business_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

-- Add updated_at triggers for tables that need them
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sequences_updated_at BEFORE UPDATE ON sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sequence_enrollments_updated_at BEFORE UPDATE ON sequence_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sequences', 'sequence_steps', 'sequence_enrollments', 'message_templates', 'messages', 'automation_logs')
ORDER BY table_name;
