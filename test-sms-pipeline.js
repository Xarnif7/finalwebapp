/**
 * Test SMS Pipeline
 * This script tests the complete SMS pipeline from template test to actual sending
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3001';

async function testSMSPipeline() {
  console.log('🧪 Testing SMS Pipeline...\n');

  try {
    // Test 1: Check if test-send API is working
    console.log('1. Testing /api/test-send endpoint...');
    
    const testResponse = await fetch(`${BASE_URL}/api/test-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        business_id: 'test-business-123', // This will fail but we can see the error
        message: 'Test SMS message',
        template_name: 'Test Template',
        service_type: 'Test',
        channels: ['sms'],
        phone: '+1234567890'
      })
    });

    const testResult = await testResponse.json();
    console.log('   Response:', testResult);
    
    if (testResponse.ok) {
      console.log('   ✅ Test send API is working');
    } else {
      console.log('   ⚠️  Test send API error:', testResult.error);
    }

    // Test 2: Check Surge SMS send endpoint directly
    console.log('\n2. Testing /api/surge/sms/send endpoint...');
    
    const surgeResponse = await fetch(`${BASE_URL}/api/surge/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        businessId: 'test-business-123',
        to: '+1234567890',
        body: 'Test message from pipeline test'
      })
    });

    const surgeResult = await surgeResponse.json();
    console.log('   Response:', surgeResult);
    
    if (surgeResponse.ok) {
      console.log('   ✅ Surge SMS send API is working');
    } else {
      console.log('   ⚠️  Surge SMS send API error:', surgeResult.error);
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
