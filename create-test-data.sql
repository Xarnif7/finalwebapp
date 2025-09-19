-- Create test data for Zapier endpoints
-- Run this in Supabase SQL Editor

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
  (SELECT id FROM businesses LIMIT 1),
  'Welcome Email Sequence',
  'active',
  'job_completed',
  true,
  '22:00:00',
  '08:00:00',
  100,
  1000
);

-- Insert a test message template
INSERT INTO message_templates (
  id,
  business_id,
  channel,
  name,
  subject,
  body
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM businesses LIMIT 1),
  'email',
  'Welcome Email',
  'Welcome to our service!',
  'Hi {{customer_name}},\n\nThank you for choosing our service! We''re excited to have you on board.\n\nBest regards,\nThe Team'
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
  (SELECT id FROM sequences WHERE name = 'Welcome Email Sequence' LIMIT 1),
  'send_email',
  0,
  NULL,
  (SELECT id FROM message_templates WHERE name = 'Welcome Email' LIMIT 1)
),
(
  gen_random_uuid(),
  (SELECT id FROM sequences WHERE name = 'Welcome Email Sequence' LIMIT 1),
  'wait',
  1,
  86400000, -- 24 hours in milliseconds
  NULL
),
(
  gen_random_uuid(),
  (SELECT id FROM sequences WHERE name = 'Welcome Email Sequence' LIMIT 1),
  'send_email',
  2,
  NULL,
  (SELECT id FROM message_templates WHERE name = 'Welcome Email' LIMIT 1)
);

-- Verify the data was created
SELECT 
  s.name as sequence_name,
  s.status,
  s.trigger_event_type,
  COUNT(ss.id) as step_count
FROM sequences s
LEFT JOIN sequence_steps ss ON s.id = ss.sequence_id
WHERE s.name = 'Welcome Email Sequence'
GROUP BY s.id, s.name, s.status, s.trigger_event_type;
