-- Create test data for automation runner
-- Run this in Supabase SQL Editor

-- Insert a test business with rate limits
INSERT INTO businesses (
  id,
  name,
  created_by,
  rate_per_hour,
  rate_per_day
) VALUES (
  gen_random_uuid(),
  'Test Business for Automation',
  'system',
  10,
  100
);

-- Insert a test sequence
INSERT INTO sequences (
  id,
  business_id,
  name,
  status,
  trigger_event_type,
  allow_manual_enroll,
  quiet_hours_start,
  quiet_hours_end,
  rate_per_hour,
  rate_per_day
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM businesses WHERE name = 'Test Business for Automation' LIMIT 1),
  'Test Automation Sequence',
  'active',
  'job_completed',
  true,
  '22:00:00',
  '08:00:00',
  10,
  100
);

-- Insert test message templates
INSERT INTO message_templates (
  id,
  business_id,
  channel,
  name,
  subject,
  body
) VALUES 
(
  gen_random_uuid(),
  (SELECT id FROM businesses WHERE name = 'Test Business for Automation' LIMIT 1),
  'email',
  'Welcome Email Template',
  'Welcome to our service!',
  'Hi {{customer_name}},\n\nThank you for choosing our service! We''re excited to have you on board.\n\nBest regards,\nThe Team'
),
(
  gen_random_uuid(),
  (SELECT id FROM businesses WHERE name = 'Test Business for Automation' LIMIT 1),
  'sms',
  'Follow-up SMS Template',
  '',
  'Hi {{customer_name}}, just checking in! How was your experience?'
);

-- Insert sequence steps
INSERT INTO sequence_steps (
  id,
  sequence_id,
  kind,
  step_index,
  wait_ms,
  template_id
) VALUES 
(
  gen_random_uuid(),
  (SELECT id FROM sequences WHERE name = 'Test Automation Sequence' LIMIT 1),
  'send_email',
  0,
  NULL,
  (SELECT id FROM message_templates WHERE name = 'Welcome Email Template' LIMIT 1)
),
(
  gen_random_uuid(),
  (SELECT id FROM sequences WHERE name = 'Test Automation Sequence' LIMIT 1),
  'wait',
  1,
  30000, -- 30 seconds for testing
  NULL
),
(
  gen_random_uuid(),
  (SELECT id FROM sequences WHERE name = 'Test Automation Sequence' LIMIT 1),
  'send_sms',
  2,
  NULL,
  (SELECT id FROM message_templates WHERE name = 'Follow-up SMS Template' LIMIT 1)
);

-- Insert a test customer
INSERT INTO customers (
  id,
  business_id,
  full_name,
  email,
  phone,
  status,
  created_by
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM businesses WHERE name = 'Test Business for Automation' LIMIT 1),
  'Test Customer',
  'test@example.com',
  '5551234567',
  'active',
  'system'
);

-- Insert a test enrollment (due now)
INSERT INTO sequence_enrollments (
  id,
  business_id,
  sequence_id,
  customer_id,
  status,
  current_step_index,
  next_run_at,
  last_event_at,
  meta
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM businesses WHERE name = 'Test Business for Automation' LIMIT 1),
  (SELECT id FROM sequences WHERE name = 'Test Automation Sequence' LIMIT 1),
  (SELECT id FROM customers WHERE email = 'test@example.com' LIMIT 1),
  'active',
  0,
  now() - interval '1 minute', -- Due now
  now() - interval '1 minute',
  '{}'
);

-- Verify the data was created
SELECT 
  b.name as business_name,
  s.name as sequence_name,
  c.full_name as customer_name,
  se.status as enrollment_status,
  se.current_step_index,
  se.next_run_at
FROM businesses b
JOIN sequences s ON s.business_id = b.id
JOIN sequence_enrollments se ON se.sequence_id = s.id
JOIN customers c ON c.id = se.customer_id
WHERE b.name = 'Test Business for Automation';
