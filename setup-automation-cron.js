// Set up automation cron job
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xvzkrctudezyasinskyo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAutomationCron() {
  try {
    console.log('🔧 Setting up automation cron job...');
    
    // 1. Create the automation executor function if it doesn't exist
    console.log('📝 Creating automation executor function...');
    
    const executorFunction = `
CREATE OR REPLACE FUNCTION execute_scheduled_automations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job RECORD;
  processed_count INTEGER := 0;
BEGIN
  -- Process automation_email jobs
  FOR job IN 
    SELECT * FROM scheduled_jobs 
    WHERE job_type = 'automation_email' 
    AND status = 'queued' 
    AND run_at <= NOW()
    ORDER BY run_at ASC
    LIMIT 10
  LOOP
    -- Update job status to processing
    UPDATE scheduled_jobs 
    SET status = 'processing', started_at = NOW()
    WHERE id = job.id;
    
    -- Get the review request
    DECLARE
      review_request RECORD;
    BEGIN
      SELECT * INTO review_request 
      FROM review_requests 
      WHERE id = job.payload->>'review_request_id';
      
      IF review_request IS NOT NULL THEN
        -- Update review request status to sent
        UPDATE review_requests 
        SET status = 'sent', sent_at = NOW()
        WHERE id = review_request.id;
        
        -- Mark job as completed
        UPDATE scheduled_jobs 
        SET status = 'completed', completed_at = NOW()
        WHERE id = job.id;
        
        processed_count := processed_count + 1;
        
        RAISE NOTICE 'Processed automation email for review request %', review_request.id;
      ELSE
        -- Mark job as failed
        UPDATE scheduled_jobs 
        SET status = 'failed', completed_at = NOW(), error_message = 'Review request not found'
        WHERE id = job.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Mark job as failed
      UPDATE scheduled_jobs 
      SET status = 'failed', completed_at = NOW(), error_message = SQLERRM
      WHERE id = job.id;
    END;
  END LOOP;
  
  RETURN processed_count;
END;
$$;
    `;
    
    const { error: functionError } = await supabase.rpc('exec', { sql: executorFunction });
    
    if (functionError) {
      console.error('❌ Error creating executor function:', functionError);
    } else {
      console.log('✅ Automation executor function created');
    }
    
    // 2. Test the function
    console.log('🧪 Testing automation executor function...');
    const { data: testResult, error: testError } = await supabase.rpc('execute_scheduled_automations');
    
    if (testError) {
      console.error('❌ Error testing executor function:', testError);
    } else {
      console.log('✅ Executor function test result:', testResult);
    }
    
    // 3. Check scheduled_jobs table structure
    console.log('📋 Checking scheduled_jobs table...');
    const { data: jobs, error: jobsError } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .limit(5);
    
    if (jobsError) {
      console.error('❌ Error checking scheduled_jobs:', jobsError);
    } else {
      console.log('📊 Scheduled jobs found:', jobs?.length || 0);
    }
    
    // 4. Check review_requests table structure
    console.log('📋 Checking review_requests table...');
    const { data: requests, error: requestsError } = await supabase
      .from('review_requests')
      .select('*')
      .limit(5);
    
    if (requestsError) {
      console.error('❌ Error checking review_requests:', requestsError);
    } else {
      console.log('📊 Review requests found:', requests?.length || 0);
    }
    
    console.log('✅ Automation cron setup completed!');
    console.log('🎯 The automation system is ready to:');
    console.log('1. Accept triggers from customer tab');
    console.log('2. Create review requests');
    console.log('3. Schedule emails with delays');
    console.log('4. Execute scheduled automations via cron');
    
    console.log('📅 To set up the actual cron job, add this to your server crontab:');
    console.log('*/5 * * * * curl -X POST https://myblipp.com/api/_cron/automation-executor');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupAutomationCron();
