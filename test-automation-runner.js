const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';
const CRON_SECRET = process.env.CRON_SECRET || 'test_cron_secret_123';

async function testAutomationRunner() {
  console.log('🧪 Testing automation runner...\n');

  try {
    const response = await fetch(`${BASE_URL}/api/cron/automation-runner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Secret': CRON_SECRET
      }
    });

    const result = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.ok) {
      console.log('✅ Automation runner test passed!');
      console.log(`Processed: ${result.processed} enrollments`);
      console.log(`Errors: ${result.errors}`);
      console.log(`Businesses: ${result.businesses}`);
    } else {
      console.log('❌ Automation runner test failed!');
    }
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

async function testUnauthorized() {
  console.log('\n🧪 Testing unauthorized access...\n');

  try {
    const response = await fetch(`${BASE_URL}/api/cron/automation-runner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Secret': 'invalid_secret'
      }
    });

    const result = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.status === 401 && result.error === 'Unauthorized') {
      console.log('✅ Unauthorized test passed!');
    } else {
      console.log('❌ Unauthorized test failed!');
    }
  } catch (error) {
    console.error('❌ Unauthorized test error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting automation runner tests...\n');
  console.log('Base URL:', BASE_URL);
  console.log('Cron Secret:', CRON_SECRET.substring(0, 10) + '...\n');

  // Test 1: Automation runner
  await testAutomationRunner();
  
  // Test 2: Unauthorized access
  await testUnauthorized();

  console.log('\n🎉 All tests completed!');
}

runTests().catch(console.error);
