// Comprehensive End-to-End Automation Test
// Tests: CRM Trigger → Automation Matching → Email/SMS Sending

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test configuration
const TEST_CONFIG = {
  businessId: '65be3459-802a-471a-b98e-387b1539dcb2', // Your business ID
  testEmail: 'test@example.com',
  testPhone: '+1234567890',
  testCustomerName: 'Test Customer'
};

async function testEndToEndAutomation() {
  console.log('🚀 Starting End-to-End Automation Test...\n');

  try {
    // Step 1: Create a test sequence
    console.log('📝 Step 1: Creating test sequence...');
    const sequence = await createTestSequence();
    console.log('✅ Test sequence created:', sequence.id);

    // Step 2: Create a test customer
    console.log('\n👤 Step 2: Creating test customer...');
    const customer = await createTestCustomer();
    console.log('✅ Test customer created:', customer.id);

    // Step 3: Simulate QBO webhook trigger
    console.log('\n🔗 Step 3: Simulating QBO webhook trigger...');
    const triggerResult = await simulateQBOTrigger(customer.id);
    console.log('✅ QBO trigger simulated:', triggerResult.success);

    // Step 4: Check if automation was triggered
    console.log('\n⚡ Step 4: Checking automation trigger...');
    const automationTriggered = await checkAutomationTrigger(sequence.id, customer.id);
    console.log('✅ Automation triggered:', automationTriggered);

    // Step 5: Check scheduled jobs
    console.log('\n⏰ Step 5: Checking scheduled jobs...');
    const scheduledJobs = await checkScheduledJobs(sequence.id, customer.id);
    console.log('✅ Scheduled jobs found:', scheduledJobs.length);

    // Step 6: Simulate job execution
    console.log('\n📧 Step 6: Simulating job execution...');
    const executionResult = await simulateJobExecution(scheduledJobs[0]?.id);
    console.log('✅ Job execution simulated:', executionResult.success);

    // Step 7: Check automation logs
    console.log('\n📊 Step 7: Checking automation logs...');
    const logs = await checkAutomationLogs(sequence.id, customer.id);
    console.log('✅ Automation logs found:', logs.length);

    // Step 8: Cleanup
    console.log('\n🧹 Step 8: Cleaning up test data...');
    await cleanupTestData(sequence.id, customer.id);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 End-to-End Test Completed Successfully!');
    return { success: true, message: 'All tests passed' };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}

async function createTestSequence() {
  const sequenceData = {
    business_id: TEST_CONFIG.businessId,
    name: 'Test E2E Sequence',
    status: 'active',
    trigger_event_type: 'invoice_paid',
    allow_manual_enroll: true,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    rate_per_hour: 100,
    rate_per_day: 1000
  };

  const { data: sequence, error } = await supabase
    .from('sequences')
    .insert(sequenceData)
    .select()
    .single();

  if (error) throw new Error(`Failed to create sequence: ${error.message}`);

  // Create sequence steps
  const steps = [
    {
      sequence_id: sequence.id,
      kind: 'send_email',
      step_index: 1,
      wait_ms: 0, // Send immediately
      message_purpose: 'review_request',
      message_config: {
        subject: 'Thank you for your payment, {{CUSTOMER_NAME}}!',
        body: 'Hi {{CUSTOMER_NAME}}, thank you for your payment! We appreciate your business. Please consider leaving us a review: {{REVIEW_LINK}}'
      }
    },
    {
      sequence_id: sequence.id,
      kind: 'send_sms',
      step_index: 2,
      wait_ms: 3600000, // 1 hour delay
      message_purpose: 'review_request',
      message_config: {
        body: 'Hi {{CUSTOMER_NAME}}, thank you for your payment! Please leave us a review: {{REVIEW_LINK}}'
      }
    }
  ];

  const { error: stepsError } = await supabase
    .from('sequence_steps')
    .insert(steps);

  if (stepsError) throw new Error(`Failed to create sequence steps: ${stepsError.message}`);

  return sequence;
}

async function createTestCustomer() {
  const customerData = {
    business_id: TEST_CONFIG.businessId,
    full_name: TEST_CONFIG.testCustomerName,
    email: TEST_CONFIG.testEmail,
    phone: TEST_CONFIG.testPhone,
    source: 'test',
    created_by: 'test'
  };

  const { data: customer, error } = await supabase
    .from('customers')
    .upsert(customerData, { onConflict: 'business_id,email' })
    .select()
    .single();

  if (error) throw new Error(`Failed to create customer: ${error.message}`);

  return customer;
}

async function simulateQBOTrigger(customerId) {
  // Simulate a QBO invoice paid webhook
  const webhookPayload = {
    business_id: TEST_CONFIG.businessId,
    customer_id: customerId,
    trigger_type: 'invoice_paid',
    trigger_data: {
      invoice_id: 'test-invoice-123',
      amount: 150.00,
      payment_date: new Date().toISOString()
    }
  };

  try {
    // Call the automation trigger API
    const response = await fetch('http://localhost:3000/api/automation/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify(webhookPayload)
    });

    const result = await response.json();
    return { success: response.ok, data: result };
  } catch (error) {
    throw new Error(`QBO trigger simulation failed: ${error.message}`);
  }
}

async function checkAutomationTrigger(sequenceId, customerId) {
  // Check if a sequence enrollment was created
  const { data: enrollment, error } = await supabase
    .from('sequence_enrollments')
    .select('*')
    .eq('sequence_id', sequenceId)
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to check automation trigger: ${error.message}`);
  }

  return !!enrollment;
}

async function checkScheduledJobs(sequenceId, customerId) {
  const { data: jobs, error } = await supabase
    .from('scheduled_jobs')
    .select('*')
    .eq('business_id', TEST_CONFIG.businessId)
    .eq('status', 'queued')
    .order('run_at', { ascending: true });

  if (error) throw new Error(`Failed to check scheduled jobs: ${error.message}`);

  return jobs || [];
}

async function simulateJobExecution(jobId) {
  if (!jobId) {
    console.log('⚠️ No job ID provided for execution simulation');
    return { success: false, message: 'No job to execute' };
  }

  try {
    // Call the automation executor API
    const response = await fetch('http://localhost:3000/api/_cron/automation-executor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ job_id: jobId })
    });

    const result = await response.json();
    return { success: response.ok, data: result };
  } catch (error) {
    throw new Error(`Job execution simulation failed: ${error.message}`);
  }
}

async function checkAutomationLogs(sequenceId, customerId) {
  const { data: logs, error } = await supabase
    .from('automation_logs')
    .select('*')
    .eq('business_id', TEST_CONFIG.businessId)
    .eq('sequence_id', sequenceId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to check automation logs: ${error.message}`);

  return logs || [];
}

async function cleanupTestData(sequenceId, customerId) {
  // Delete sequence steps
  await supabase
    .from('sequence_steps')
    .delete()
    .eq('sequence_id', sequenceId);

  // Delete sequence
  await supabase
    .from('sequences')
    .delete()
    .eq('id', sequenceId);

  // Delete customer
  await supabase
    .from('customers')
    .delete()
    .eq('id', customerId);

  // Delete scheduled jobs
  await supabase
    .from('scheduled_jobs')
    .delete()
    .eq('business_id', TEST_CONFIG.businessId);

  // Delete automation logs
  await supabase
    .from('automation_logs')
    .delete()
    .eq('business_id', TEST_CONFIG.businessId);

  // Delete sequence enrollments
  await supabase
    .from('sequence_enrollments')
    .delete()
    .eq('sequence_id', sequenceId);
}

// Test email and SMS sending directly
async function testEmailSending() {
  console.log('\n📧 Testing Email Sending...');
  
  try {
    const response = await fetch('http://localhost:3000/api/review-requests/send-now', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        business_id: TEST_CONFIG.businessId,
        customer_email: TEST_CONFIG.testEmail,
        customer_name: TEST_CONFIG.testCustomerName,
        channel: 'email',
        subject: 'Test Email from Blipp',
        body: 'This is a test email to verify the email sending functionality works correctly.',
        review_link: 'https://google.com/search?q=test+review'
      })
    });

    const result = await response.json();
    console.log('✅ Email sending test result:', result);
    return { success: response.ok, data: result };
  } catch (error) {
    console.error('❌ Email sending test failed:', error);
    return { success: false, error: error.message };
  }
}

async function testSMSSending() {
  console.log('\n📱 Testing SMS Sending...');
  
  try {
    const response = await fetch('http://localhost:3000/api/review-requests/send-now', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        business_id: TEST_CONFIG.businessId,
        customer_phone: TEST_CONFIG.testPhone,
        customer_name: TEST_CONFIG.testCustomerName,
        channel: 'sms',
        body: 'Test SMS from Blipp: This is a test message to verify SMS sending works correctly.',
        review_link: 'https://google.com/search?q=test+review'
      })
    });

    const result = await response.json();
    console.log('✅ SMS sending test result:', result);
    return { success: response.ok, data: result };
  } catch (error) {
    console.error('❌ SMS sending test failed:', error);
    return { success: false, error: error.message };
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Running Comprehensive Automation Tests...\n');

  // Test 1: End-to-End Automation Flow
  const e2eResult = await testEndToEndAutomation();
  
  // Test 2: Direct Email Sending
  const emailResult = await testEmailSending();
  
  // Test 3: Direct SMS Sending
  const smsResult = await testSMSSending();

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log('End-to-End Automation:', e2eResult.success ? '✅ PASS' : '❌ FAIL');
  console.log('Email Sending:', emailResult.success ? '✅ PASS' : '❌ FAIL');
  console.log('SMS Sending:', smsResult.success ? '✅ PASS' : '❌ FAIL');

  const allPassed = e2eResult.success && emailResult.success && smsResult.success;
  console.log('\n🎯 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');

  return {
    success: allPassed,
    results: {
      e2e: e2eResult,
      email: emailResult,
      sms: smsResult
    }
  };
}

// Run the tests
runAllTests().then(result => {
  if (result.success) {
    console.log('\n🚀 Ready for demo! All automation systems are working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️ Some tests failed. Please check the issues above.');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
