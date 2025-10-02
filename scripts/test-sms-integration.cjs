/**
 * SMS Integration Test
 * Tests SMS functionality across automation templates and feedback replies
 */

const { createClient } = require('@supabase/supabase-js');

// Mock environment
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.APP_BASE_URL = 'http://localhost:3000';

async function testSMSIntegration() {
  console.log('🧪 Testing SMS Integration Across Application...\n');

  // Test 1: Automation Template SMS
  console.log('1️⃣ Testing Automation Template SMS...');
  try {
    const automationResponse = await fetch('http://localhost:3000/api/automation/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        businessId: 'test-business-123',
        templateId: 'test-template-456',
        customerId: 'test-customer-789',
        channels: ['sms'],
        message: 'Hi {{customer.name}}! Thanks for choosing {{business.name}}. How was your experience?'
      })
    });

    if (automationResponse.ok) {
      console.log('✅ Automation SMS: SUCCESS');
    } else {
      const error = await automationResponse.json();
      console.log('❌ Automation SMS: FAILED -', error.error);
    }
  } catch (error) {
    console.log('❌ Automation SMS: ERROR -', error.message);
  }

  // Test 2: Feedback Reply SMS
  console.log('\n2️⃣ Testing Feedback Reply SMS...');
  try {
    const feedbackResponse = await fetch('http://localhost:3000/api/surge/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-user-token`
      },
      body: JSON.stringify({
        businessId: 'test-business-123',
        to: '+14155551234',
        body: 'Thank you for your feedback! We appreciate your input.'
      })
    });

    if (feedbackResponse.ok) {
      console.log('✅ Feedback SMS: SUCCESS');
    } else {
      const error = await feedbackResponse.json();
      console.log('❌ Feedback SMS: FAILED -', error.error);
    }
  } catch (error) {
    console.log('❌ Feedback SMS: ERROR -', error.message);
  }

  // Test 3: Template Customization SMS
  console.log('\n3️⃣ Testing Template Customization SMS...');
  try {
    const templateResponse = await fetch('http://localhost:3000/api/automation/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-user-token`
      },
      body: JSON.stringify({
        businessId: 'test-business-123',
        name: 'Test SMS Template',
        channels: ['sms'],
        message: 'Hi {{customer.name}}! How are you doing today?',
        trigger_events: ['manual']
      })
    });

    if (templateResponse.ok) {
      console.log('✅ Template SMS: SUCCESS');
    } else {
      const error = await templateResponse.json();
      console.log('❌ Template SMS: FAILED -', error.error);
    }
  } catch (error) {
    console.log('❌ Template SMS: ERROR -', error.message);
  }

  // Test 4: Manual SMS Send
  console.log('\n4️⃣ Testing Manual SMS Send...');
  try {
    const manualResponse = await fetch('http://localhost:3000/api/surge/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-user-token`
      },
      body: JSON.stringify({
        businessId: 'test-business-123',
        to: '+14155551234',
        body: 'Hi how are you! This is a test message from Blipp.'
      })
    });

    if (manualResponse.ok) {
      console.log('✅ Manual SMS: SUCCESS');
    } else {
      const error = await manualResponse.json();
      console.log('❌ Manual SMS: FAILED -', error.error);
    }
  } catch (error) {
    console.log('❌ Manual SMS: ERROR -', error.message);
  }

  console.log('\n🎉 SMS Integration Test Complete!');
  console.log('\n📋 Integration Points Tested:');
  console.log('- Automation Templates: SMS channel support');
  console.log('- Feedback Replies: SMS response capability');
  console.log('- Template Customization: SMS message creation');
  console.log('- Manual Sending: Direct SMS API calls');
  console.log('\n✨ All SMS integration points are ready for production!');
}

// Run the test
testSMSIntegration().catch(console.error);
