-- Migration: Add automation templates and business integrations schema
-- Created: 2025-01-20
-- Description: Adds tables for automation templates, business integrations, and related enums

-- Create enums
CREATE TYPE automation_template_status AS ENUM ('draft', 'ready', 'active', 'paused');
CREATE TYPE automation_template_key AS ENUM ('job_completed', 'invoice_paid', 'service_reminder');
CREATE TYPE automation_trigger_type AS ENUM ('event', 'date_based');
CREATE TYPE integration_provider AS ENUM ('zapier', 'webhook', 'api', 'manual');

-- Note: businesses table already exists with created_by field
-- No need to recreate it

-- Note: customers table already exists with business_id column
-- Just add missing columns if they don't exist
ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source TEXT;

-- Create automation_templates table
CREATE TABLE IF NOT EXISTS automation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    key automation_template_key NOT NULL,
    name TEXT NOT NULL,
    status automation_template_status NOT NULL DEFAULT 'draft',
    channels TEXT[] NOT NULL DEFAULT '{}', -- Array of channels: ['sms', 'email']
    trigger_type automation_trigger_type NOT NULL DEFAULT 'event',
    config_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create business_integrations table
CREATE TABLE IF NOT EXISTS business_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    provider integration_provider NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'error'
    metadata_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_templates_business_key 
    ON automation_templates(business_id, key);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_business_email 
    ON customers(business_id, email) 
    WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_business_id 
    ON customers(business_id);

CREATE INDEX IF NOT EXISTS idx_automation_templates_business_id 
    ON automation_templates(business_id);

CREATE INDEX IF NOT EXISTS idx_automation_templates_status 
    ON automation_templates(status);

CREATE INDEX IF NOT EXISTS idx_business_integrations_business_id 
    ON business_integrations(business_id);

CREATE INDEX IF NOT EXISTS idx_business_integrations_provider 
    ON business_integrations(provider);

-- Add RLS policies
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_integrations ENABLE ROW LEVEL SECURITY;

-- Businesses policies (using existing created_by field)
CREATE POLICY "Users can view their own businesses" ON businesses
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own businesses" ON businesses
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own businesses" ON businesses
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own businesses" ON businesses
    FOR DELETE USING (auth.uid() = created_by);

-- Customers policies (using existing created_by field in customers table)
CREATE POLICY "Users can view customers from their businesses" ON customers
    FOR SELECT USING (
        created_by = auth.uid() OR
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert customers to their businesses" ON customers
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update customers from their businesses" ON customers
    FOR UPDATE USING (
        created_by = auth.uid() OR
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete customers from their businesses" ON customers
    FOR DELETE USING (
        created_by = auth.uid() OR
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

-- Automation templates policies
CREATE POLICY "Users can view automation templates from their businesses" ON automation_templates
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert automation templates to their businesses" ON automation_templates
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update automation templates from their businesses" ON automation_templates
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete automation templates from their businesses" ON automation_templates
    FOR DELETE USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

-- Business integrations policies
CREATE POLICY "Users can view integrations from their businesses" ON business_integrations
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert integrations to their businesses" ON business_integrations
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update integrations from their businesses" ON business_integrations
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete integrations from their businesses" ON business_integrations
    FOR DELETE USING (
        business_id IN (
            SELECT id FROM businesses WHERE created_by = auth.uid()
        )
    );

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_businesses_updated_at 
    BEFORE UPDATE ON businesses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_templates_updated_at 
    BEFORE UPDATE ON automation_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_integrations_updated_at 
    BEFORE UPDATE ON business_integrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default automation templates for existing businesses
-- This will create default templates for each business
INSERT INTO automation_templates (business_id, key, name, status, channels, trigger_type, config_json)
SELECT 
    b.id as business_id,
    'job_completed' as key,
    'Job Completed' as name,
    'ready' as status,
    ARRAY['sms', 'email'] as channels,
    'event' as trigger_type,
    '{"message": "Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review.", "delay_hours": 24}' as config_json
FROM businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM automation_templates at 
    WHERE at.business_id = b.id AND at.key = 'job_completed'
);

INSERT INTO automation_templates (business_id, key, name, status, channels, trigger_type, config_json)
SELECT 
    b.id as business_id,
    'invoice_paid' as key,
    'Invoice Paid' as name,
    'ready' as status,
    ARRAY['email', 'sms'] as channels,
    'event' as trigger_type,
    '{"message": "Thank you for your payment! We appreciate your business. Please consider leaving us a review.", "delay_hours": 48}' as config_json
FROM businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM automation_templates at 
    WHERE at.business_id = b.id AND at.key = 'invoice_paid'
);

INSERT INTO automation_templates (business_id, key, name, status, channels, trigger_type, config_json)
SELECT 
    b.id as business_id,
    'service_reminder' as key,
    'Service Reminder' as name,
    'ready' as status,
    ARRAY['sms', 'email'] as channels,
    'date_based' as trigger_type,
    '{"message": "This is a friendly reminder about your upcoming service appointment. We look forward to serving you!", "delay_days": 1}' as config_json
FROM businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM automation_templates at 
    WHERE at.business_id = b.id AND at.key = 'service_reminder'
);
