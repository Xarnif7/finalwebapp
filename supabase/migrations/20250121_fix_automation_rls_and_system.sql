-- Fix automation RLS policies to use email-based auth and create complete automation system
-- This migration fixes the RLS policies and creates the missing automation execution system

-- 1. Fix RLS policies to use email-based authentication
DROP POLICY IF EXISTS "Users can view automation templates from their businesses" ON automation_templates;
DROP POLICY IF EXISTS "Users can insert automation templates to their businesses" ON automation_templates;
DROP POLICY IF EXISTS "Users can update automation templates from their businesses" ON automation_templates;
DROP POLICY IF EXISTS "Users can delete automation templates from their businesses" ON automation_templates;

-- Create new email-based policies for automation_templates
CREATE POLICY "Users can view automation templates by email" ON automation_templates
FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert automation templates by email" ON automation_templates
FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can update automation templates by email" ON automation_templates
FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete automation templates by email" ON automation_templates
FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

-- Fix business_integrations policies
DROP POLICY IF EXISTS "Users can view integrations from their businesses" ON business_integrations;
DROP POLICY IF EXISTS "Users can insert integrations to their businesses" ON business_integrations;
DROP POLICY IF EXISTS "Users can update integrations from their businesses" ON business_integrations;
DROP POLICY IF EXISTS "Users can delete integrations from their businesses" ON business_integrations;

CREATE POLICY "Users can view business integrations by email" ON business_integrations
FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert business integrations by email" ON business_integrations
FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can update business integrations by email" ON business_integrations
FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete business integrations by email" ON business_integrations
FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

-- 2. Create automation_executions table to track automation runs
CREATE TABLE IF NOT EXISTS automation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    template_id UUID REFERENCES automation_templates(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL,
    trigger_data JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sent', 'failed', 'skipped')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for automation_executions
CREATE INDEX IF NOT EXISTS idx_automation_executions_business_id ON automation_executions(business_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_template_id ON automation_executions(template_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_customer_id ON automation_executions(customer_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_automation_executions_scheduled_for ON automation_executions(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_automation_executions_trigger_type ON automation_executions(trigger_type);

-- 4. Enable RLS on automation_executions
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for automation_executions
CREATE POLICY "Users can view automation executions by email" ON automation_executions
FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert automation executions by email" ON automation_executions
FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can update automation executions by email" ON automation_executions
FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete automation executions by email" ON automation_executions
FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));

-- 6. Create function to trigger automation for a customer
CREATE OR REPLACE FUNCTION trigger_automation(
    p_business_id UUID,
    p_customer_id UUID,
    p_trigger_type TEXT,
    p_trigger_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    template_record RECORD;
    execution_id UUID;
    scheduled_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get active templates for this trigger type
    FOR template_record IN 
        SELECT id, config_json, channels
        FROM automation_templates 
        WHERE business_id = p_business_id 
        AND status = 'active'
        AND trigger_type = p_trigger_type
    LOOP
        -- Calculate scheduled time based on delay
        scheduled_time := NOW();
        
        -- Add delay based on config
        IF template_record.config_json ? 'delay_hours' THEN
            scheduled_time := scheduled_time + (template_record.config_json->>'delay_hours')::INTEGER * INTERVAL '1 hour';
        ELSIF template_record.config_json ? 'delay_days' THEN
            scheduled_time := scheduled_time + (template_record.config_json->>'delay_days')::INTEGER * INTERVAL '1 day';
        END IF;
        
        -- Create execution record
        INSERT INTO automation_executions (
            business_id,
            template_id,
            customer_id,
            trigger_type,
            trigger_data,
            status,
            scheduled_for
        ) VALUES (
            p_business_id,
            template_record.id,
            p_customer_id,
            p_trigger_type,
            p_trigger_data,
            'scheduled',
            scheduled_time
        ) RETURNING id INTO execution_id;
        
        -- Log the automation trigger
        INSERT INTO automation_logs (
            business_id,
            level,
            source,
            template_id,
            customer_id,
            message,
            data
        ) VALUES (
            p_business_id,
            'info',
            'trigger',
            template_record.id,
            p_customer_id,
            'Automation triggered for ' || p_trigger_type,
            jsonb_build_object('execution_id', execution_id, 'scheduled_for', scheduled_time)
        );
    END LOOP;
    
    RETURN execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to execute scheduled automations
CREATE OR REPLACE FUNCTION execute_scheduled_automations()
RETURNS INTEGER AS $$
DECLARE
    execution_record RECORD;
    customer_record RECORD;
    business_record RECORD;
    template_record RECORD;
    review_link TEXT;
    message_body TEXT;
    subject_text TEXT;
    processed_count INTEGER := 0;
    channel TEXT;
BEGIN
    -- Get all due executions
    FOR execution_record IN 
        SELECT ae.*, c.full_name, c.email, c.phone, b.name as business_name, b.email as business_email
        FROM automation_executions ae
        JOIN customers c ON ae.customer_id = c.id
        JOIN businesses b ON ae.business_id = b.id
        WHERE ae.status = 'scheduled'
        AND ae.scheduled_for <= NOW()
        LIMIT 50
    LOOP
        -- Get template details
        SELECT * INTO template_record 
        FROM automation_templates 
        WHERE id = execution_record.template_id;
        
        -- Generate review link
        review_link := 'https://myblipp.com/r/' || encode(gen_random_bytes(8), 'hex');
        
        -- Process each channel
        FOREACH channel IN ARRAY template_record.channels
        LOOP
            -- Skip SMS for now (as requested)
            IF channel = 'sms' THEN
                CONTINUE;
            END IF;
            
            -- Prepare message
            message_body := template_record.config_json->>'message';
            message_body := replace(message_body, '{{customer.name}}', COALESCE(execution_record.full_name, 'Customer'));
            message_body := replace(message_body, '{{business.name}}', COALESCE(execution_record.business_name, 'Our Business'));
            message_body := replace(message_body, '{{review_link}}', review_link);
            
            -- Set subject for email
            IF channel = 'email' THEN
                subject_text := 'Thank you for your business!';
                IF template_record.config_json ? 'subject' THEN
                    subject_text := template_record.config_json->>'subject';
                END IF;
            END IF;
            
            -- Create review request
            INSERT INTO review_requests (
                business_id,
                customer_id,
                channel,
                message,
                review_link,
                email_status,
                sms_status
            ) VALUES (
                execution_record.business_id,
                execution_record.customer_id,
                channel,
                message_body,
                review_link,
                CASE WHEN channel = 'email' THEN 'pending' ELSE 'skipped' END,
                CASE WHEN channel = 'sms' THEN 'pending' ELSE 'skipped' END
            );
        END LOOP;
        
        -- Mark execution as sent
        UPDATE automation_executions 
        SET status = 'sent', executed_at = NOW()
        WHERE id = execution_record.id;
        
        processed_count := processed_count + 1;
        
        -- Log success
        INSERT INTO automation_logs (
            business_id,
            level,
            source,
            template_id,
            customer_id,
            message,
            data
        ) VALUES (
            execution_record.business_id,
            'info',
            'sender',
            execution_record.template_id,
            execution_record.customer_id,
            'Automation executed successfully',
            jsonb_build_object('execution_id', execution_record.id, 'channels', template_record.channels)
        );
    END LOOP;
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add updated_at trigger for automation_executions
CREATE TRIGGER update_automation_executions_updated_at 
    BEFORE UPDATE ON automation_executions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_automation_executions_due ON automation_executions(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_automation_templates_active ON automation_templates(business_id, trigger_type) WHERE status = 'active';

-- 10. Show current automation templates
SELECT 'Current automation templates:' as info;
SELECT at.id, at.business_id, at.key, at.name, at.status, at.channels, at.trigger_type, b.created_by as business_owner_email
FROM automation_templates at
JOIN businesses b ON at.business_id = b.id
ORDER BY at.created_at DESC;
