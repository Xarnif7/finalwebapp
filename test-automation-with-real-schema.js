// Test automation with real schema
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xvzkrctudezyasinskyo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testWithRealSchema() {
  try {
    console.log('🧪 Testing automation with real schema...');
    
    // 1. Get business and customer
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, created_by')
      .limit(1)
      .single();
    
    if (!business) {
      console.error('❌ No business found');
      return;
    }
    
    const { data: customer } = await supabase
      .from('customers')
      .select('id, full_name, email, business_id')
      .eq('business_id', business.id)
      .limit(1)
      .single();
    
    if (!customer) {
      console.error('❌ No customer found');
      return;
    }
    
    console.log('🏢 Business:', business.name);
    console.log('👤 Customer:', customer.full_name);
    
    // 2. Create a test review request (without email_status column)
    console.log('📝 Creating test review request...');
    
    const reviewLink = `https://myblipp.com/r/${Math.random().toString(36).substring(2, 10)}`;
    
    const { data: reviewRequest, error: requestError } = await supabase
      .from('review_requests')
      .insert({
        business_id: business.id,
        customer_id: customer.id,
        channel: 'email',
        review_link: reviewLink,
        message: 'Thank you for your business! Please leave us a review.',
        status: 'pending',
        requested_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (requestError) {
      console.error('❌ Error creating review request:', requestError);
      
      // Try to get the actual columns by creating a minimal record
      console.log('🔍 Trying to determine review_requests schema...');
      const { data: schemaTest, error: schemaError } = await supabase
        .from('review_requests')
        .insert({
          business_id: business.id,
          customer_id: customer.id,
          channel: 'email',
          review_link: reviewLink,
          message: 'Test message'
        })
        .select()
        .single();
      
      if (schemaError) {
        console.error('❌ Schema test failed:', schemaError);
      } else {
        console.log('✅ review_requests columns:', Object.keys(schemaTest));
      }
      
      return;
    }
    
    console.log('✅ Review request created:', reviewRequest.id);
    console.log('📋 Review request columns:', Object.keys(reviewRequest));
    
    // 3. Create a test scheduled job
    console.log('⏰ Creating test scheduled job...');
    
    const sendTime = new Date();
    sendTime.setMinutes(sendTime.getMinutes() + 6);
    
    const { data: scheduledJob, error: scheduleError } = await supabase
      .from('scheduled_jobs')
      .insert({
        job_type: 'automation_email',
        payload: {
          review_request_id: reviewRequest.id,
          business_id: business.id,
          template_id: 'test-template-123',
          template_name: 'Test Automation'
        },
        run_at: sendTime.toISOString(),
        status: 'queued'
      })
      .select()
      .single();
    
    if (scheduleError) {
      console.error('❌ Error creating scheduled job:', scheduleError);
      
      // Try to determine the schema
      console.log('🔍 Trying to determine scheduled_jobs schema...');
      const { data: schemaTest, error: schemaError } = await supabase
        .from('scheduled_jobs')
        .insert({
          job_type: 'test',
          payload: { test: true },
          run_at: new Date().toISOString(),
          status: 'queued'
        })
        .select()
        .single();
      
      if (schemaError) {
        console.error('❌ Schema test failed:', schemaError);
      } else {
        console.log('✅ scheduled_jobs columns:', Object.keys(schemaTest));
      }
      
      return;
    }
    
    console.log('✅ Scheduled job created:', scheduledJob.id);
    console.log('📋 Scheduled job columns:', Object.keys(scheduledJob));
    
    // 4. Test automation executor
    console.log('🔄 Testing automation executor...');
    
    // Update job to be ready
    await supabase
      .from('scheduled_jobs')
      .update({ run_at: new Date().toISOString() })
      .eq('id', scheduledJob.id);
    
    const { data: executorResult, error: executorError } = await supabase.rpc('execute_scheduled_automations');
    
    if (executorError) {
      console.error('❌ Error running executor:', executorError);
    } else {
      console.log('✅ Executor processed jobs:', executorResult);
    }
    
    // 5. Check results
    const { data: updatedJob } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .eq('id', scheduledJob.id)
      .single();
    
    const { data: updatedRequest } = await supabase
      .from('review_requests')
      .select('*')
      .eq('id', reviewRequest.id)
      .single();
    
    console.log('📋 Final job status:', updatedJob?.status);
    console.log('📋 Final request status:', updatedRequest?.status);
    
    // 6. Cleanup
    console.log('🧹 Cleaning up...');
    await supabase.from('scheduled_jobs').delete().eq('id', scheduledJob.id);
    await supabase.from('review_requests').delete().eq('id', reviewRequest.id);
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWithRealSchema();
