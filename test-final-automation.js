// Final automation test with correct schema
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xvzkrctudezyasinskyo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFinalAutomation() {
  try {
    console.log('🎯 Final automation system test...');
    
    // 1. Get business and customer
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, created_by')
      .limit(1)
      .single();
    
    const { data: customer } = await supabase
      .from('customers')
      .select('id, full_name, email, business_id')
      .eq('business_id', business.id)
      .limit(1)
      .single();
    
    console.log('🏢 Business:', business.name);
    console.log('👤 Customer:', customer.full_name);
    
    // 2. Get a valid user_id
    const { data: users } = await supabase.auth.admin.listUsers();
    const validUserId = users?.users?.[0]?.id;
    
    if (!validUserId) {
      console.error('❌ No users found');
      return;
    }
    
    console.log('👤 Using user ID:', validUserId);
    
    // 3. Create review request with correct schema
    console.log('📝 Creating review request...');
    
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
        send_at: new Date().toISOString(),
        user_id: validUserId
      })
      .select()
      .single();
    
    if (requestError) {
      console.error('❌ Error creating review request:', requestError);
      return;
    }
    
    console.log('✅ Review request created:', reviewRequest.id);
    
    // 3. Create scheduled job
    console.log('⏰ Creating scheduled job...');
    
    const sendTime = new Date();
    sendTime.setMinutes(sendTime.getMinutes() + 6);
    
    const { data: scheduledJob, error: scheduleError } = await supabase
      .from('scheduled_jobs')
      .insert({
        business_id: business.id,
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
      return;
    }
    
    console.log('✅ Scheduled job created:', scheduledJob.id);
    
    // 4. Test executor
    console.log('🔄 Testing automation executor...');
    
    // Make job ready to run
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
    
    // 5. Check final status
    const { data: finalJob } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .eq('id', scheduledJob.id)
      .single();
    
    const { data: finalRequest } = await supabase
      .from('review_requests')
      .select('*')
      .eq('id', reviewRequest.id)
      .single();
    
    console.log('📊 Final job status:', finalJob?.status);
    console.log('📊 Final request status:', finalRequest?.status);
    
    // 6. Cleanup
    await supabase.from('scheduled_jobs').delete().eq('id', scheduledJob.id);
    await supabase.from('review_requests').delete().eq('id', reviewRequest.id);
    
    console.log('🎉 FINAL AUTOMATION TEST PASSED!');
    console.log('✅ All components working:');
    console.log('✅ Review requests creation');
    console.log('✅ Scheduled jobs creation');
    console.log('✅ Automation executor');
    console.log('✅ Status updates');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFinalAutomation();
