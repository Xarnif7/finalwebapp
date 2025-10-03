/**
 * Test SMS Pipeline
 * This script tests the complete SMS pipeline from template test to actual sending
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3001';

async function testSMSPipeline() {
  console.log('🧪 Testing SMS Pipeline...\n');

  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connectivity...');
    
    const healthResponse = await fetch(`${BASE_URL}/api/health`, {
      method: 'GET'
    });
    
    if (healthResponse.ok) {
      console.log('   ✅ Server is running');
    } else {
      console.log('   ⚠️  Server health check failed');
    }

    // Test 2: Check review requests send-now endpoint
    console.log('\n2. Testing /api/review-requests/send-now endpoint...');
    
    const sendNowResponse = await fetch(`${BASE_URL}/api/review-requests/send-now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        business_id: 'test-business-123',
        customer_id: 'test-customer-123',
        template_id: 'test-template-123',
        channels: ['sms'],
        message: 'Test message from pipeline test'
      })
    });

    if (sendNowResponse.ok) {
      const sendNowResult = await sendNowResponse.json();
      console.log('   ✅ Review requests send-now API is working');
    } else {
      console.log('   ⚠️  Review requests send-now API error (expected for test data)');
    }

    // Test 3: Check environment variables
    console.log('\n3. Checking environment variables...');
    const envVars = [
      'SURGE_API_KEY',
      'SURGE_MASTER_ACCOUNT_ID', 
      'SURGE_API_BASE',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    envVars.forEach(varName => {
      const value = process.env[varName];
      console.log(`   ${varName}: ${value ? '✅ Set' : '❌ Not set'}`);
    });

    console.log('\n🎯 SMS Pipeline Test Complete!');
    console.log('\nNext steps:');
    console.log('1. Make sure you have a business with SMS enabled in your database');
    console.log('2. Try the test send from the Templates screen in the UI');
    console.log('3. Check the server logs for any errors');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSMSPipeline();
