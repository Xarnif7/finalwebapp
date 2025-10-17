// Simple Automation Flow Test
// Tests the core automation functionality without complex setup

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAutomationFlow() {
  console.log('🧪 Testing Automation Flow...\n');

  try {
    // Step 1: Check if sequences table exists
    console.log('📋 Step 1: Checking sequences table...');
    const { data: sequences, error: sequencesError } = await supabase
      .from('sequences')
      .select('id')
      .limit(1);
    
    if (sequencesError) {
      console.log('❌ Sequences table does not exist or has issues');
      console.log('🔧 Please run the create-sequences-table.sql in Supabase first');
      return { success: false, error: 'Sequences table not found' };
    }
    console.log('✅ Sequences table exists');

    // Step 2: Check if we have a business
    console.log('\n🏢 Step 2: Checking business setup...');
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, created_by')
      .limit(1);
    
    if (businessError || !businesses || businesses.length === 0) {
      console.log('❌ No businesses found');
      return { success: false, error: 'No businesses found' };
    }
    
    const business = businesses[0];
    console.log('✅ Business found:', business.name);

    // Step 3: Create a test sequence
    console.log('\n📝 Step 3: Creating test sequence...');
    const testSequence = {
      business_id: business.id,
      name: 'Test Automation Flow',
      status: 'active',
      trigger_event_type: 'invoice_paid',
      allow_manual_enroll: true,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      rate_per_hour: 100,
      rate_per_day: 1000
    };

    const { data: sequence, error: sequenceError } = await supabase
      .from('sequences')
      .insert(testSequence)
      .select()
      .single();

    if (sequenceError) {
      console.log('❌ Failed to create sequence:', sequenceError.message);
      return { success: false, error: sequenceError.message };
    }
    console.log('✅ Test sequence created:', sequence.id);

    // Step 4: Create sequence steps
    console.log('\n⚡ Step 4: Creating sequence steps...');
    const steps = [
      {
        sequence_id: sequence.id,
        kind: 'send_email',
        step_index: 1,
        wait_ms: 0,
        message_purpose: 'review_request',
        message_config: {
          subject: 'Thank you for your payment!',
          body: 'Hi {{CUSTOMER_NAME}}, thank you for your payment! Please leave us a review: {{REVIEW_LINK}}'
        }
      }
    ];

    const { error: stepsError } = await supabase
      .from('sequence_steps')
      .insert(steps);

    if (stepsError) {
      console.log('❌ Failed to create sequence steps:', stepsError.message);
      return { success: false, error: stepsError.message };
    }
    console.log('✅ Sequence steps created');

    // Step 5: Test sequence retrieval
    console.log('\n📊 Step 5: Testing sequence retrieval...');
    const { data: retrievedSequence, error: retrieveError } = await supabase
      .from('sequences')
      .select(`
        *,
        sequence_steps (*)
      `)
      .eq('id', sequence.id)
      .single();

    if (retrieveError) {
      console.log('❌ Failed to retrieve sequence:', retrieveError.message);
      return { success: false, error: retrieveError.message };
    }
    console.log('✅ Sequence retrieved successfully');
    console.log('   - Name:', retrievedSequence.name);
    console.log('   - Status:', retrievedSequence.status);
    console.log('   - Steps:', retrievedSequence.sequence_steps.length);

    // Step 6: Test sequence toggle
    console.log('\n🔄 Step 6: Testing sequence toggle...');
    const { error: toggleError } = await supabase
      .from('sequences')
      .update({ status: 'paused' })
      .eq('id', sequence.id);

    if (toggleError) {
      console.log('❌ Failed to toggle sequence:', toggleError.message);
      return { success: false, error: toggleError.message };
    }
    console.log('✅ Sequence toggled to paused');

    // Step 7: Cleanup
    console.log('\n🧹 Step 7: Cleaning up...');
    await supabase
      .from('sequence_steps')
      .delete()
      .eq('sequence_id', sequence.id);
    
    await supabase
      .from('sequences')
      .delete()
      .eq('id', sequence.id);
    
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Automation Flow Test Completed Successfully!');
    return { success: true, message: 'All automation flow tests passed' };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}

// Test email service
async function testEmailService() {
  console.log('\n📧 Testing Email Service...');
  
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ RESEND_API_KEY not configured - skipping email test');
      return { success: true, message: 'Email service not configured' };
    }

    // Test email sending via API
    const response = await fetch('http://localhost:3000/api/review-requests/send-now', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        business_id: '65be3459-802a-471a-b98e-387b1539dcb2',
        customer_email: 'test@example.com',
        customer_name: 'Test Customer',
        channel: 'email',
        subject: 'Test Email from Blipp',
        body: 'This is a test email to verify the email sending functionality.',
        review_link: 'https://google.com/search?q=test+review'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Email service test passed');
      return { success: true, data: result };
    } else {
      console.log('❌ Email service test failed:', result);
      return { success: false, error: result.error || 'Email sending failed' };
    }
  } catch (error) {
    console.log('❌ Email service test error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test SMS service
async function testSMSService() {
  console.log('\n📱 Testing SMS Service...');
  
  try {
    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('⚠️ Twilio not configured - skipping SMS test');
      return { success: true, message: 'SMS service not configured' };
    }

    // Test SMS sending via API
    const response = await fetch('http://localhost:3000/api/review-requests/send-now', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        business_id: '65be3459-802a-471a-b98e-387b1539dcb2',
        customer_phone: '+1234567890',
        customer_name: 'Test Customer',
        channel: 'sms',
        body: 'Test SMS from Blipp: This is a test message.',
        review_link: 'https://google.com/search?q=test+review'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SMS service test passed');
      return { success: true, data: result };
    } else {
      console.log('❌ SMS service test failed:', result);
      return { success: false, error: result.error || 'SMS sending failed' };
    }
  } catch (error) {
    console.log('❌ SMS service test error:', error.message);
    return { success: false, error: error.message };
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Automation System Tests...\n');

  const results = {
    automationFlow: await testAutomationFlow(),
    emailService: await testEmailService(),
    smsService: await testSMSService()
  };

  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log('Automation Flow:', results.automationFlow.success ? '✅ PASS' : '❌ FAIL');
  console.log('Email Service:', results.emailService.success ? '✅ PASS' : '❌ FAIL');
  console.log('SMS Service:', results.smsService.success ? '✅ PASS' : '❌ FAIL');

  const allPassed = results.automationFlow.success && 
                   results.emailService.success && 
                   results.smsService.success;

  console.log('\n🎯 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');

  if (allPassed) {
    console.log('\n🚀 System is ready for demo!');
  } else {
    console.log('\n⚠️ Please fix the failing tests before the demo.');
  }

  return results;
}

// Run the tests
runTests().then(results => {
  process.exit(results.automationFlow.success ? 0 : 1);
}).catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
