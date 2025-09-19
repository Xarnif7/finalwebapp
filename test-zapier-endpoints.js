const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';
const ZAPIER_TOKEN = process.env.ZAPIER_TOKEN || 'test_zapier_token_123';

async function testUpsertCustomer() {
  console.log('🧪 Testing POST /api/zapier/upsert-customer...\n');

  const testData = {
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    external_id: 'ext_123',
    tags: ['test', 'zapier'],
    source: 'google_sheets',
    event_ts: new Date().toISOString()
  };

  try {
    const response = await fetch(`${BASE_URL}/api/zapier/upsert-customer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Zapier-Token': ZAPIER_TOKEN
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.ok) {
      console.log('✅ Upsert customer test passed!');
      return result.customer_id;
    } else {
      console.log('❌ Upsert customer test failed!');
      return null;
    }
  } catch (error) {
    console.error('❌ Upsert customer test error:', error.message);
    return null;
  }
}

async function testEvent(customerId) {
  console.log('\n🧪 Testing POST /api/zapier/event...\n');

  const testData = {
    event_type: 'job_completed',
    email: 'test@example.com',
    service_date: new Date().toISOString().split('T')[0],
    payload: {
      job_id: 'job_123',
      amount: 150.00,
      notes: 'Test job completion'
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/api/zapier/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Zapier-Token': ZAPIER_TOKEN
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.ok) {
      console.log('✅ Event test passed!');
      return true;
    } else {
      console.log('❌ Event test failed!');
      return false;
    }
  } catch (error) {
    console.error('❌ Event test error:', error.message);
    return false;
  }
}

async function testUnauthorized() {
  console.log('\n🧪 Testing unauthorized access...\n');

  try {
    const response = await fetch(`${BASE_URL}/api/zapier/upsert-customer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Zapier-Token': 'invalid_token'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User'
      })
    });

    const result = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.status === 401 && result.error === 'Unauthorized') {
      console.log('✅ Unauthorized test passed!');
      return true;
    } else {
      console.log('❌ Unauthorized test failed!');
      return false;
    }
  } catch (error) {
    console.error('❌ Unauthorized test error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Zapier endpoint tests...\n');
  console.log('Base URL:', BASE_URL);
  console.log('Zapier Token:', ZAPIER_TOKEN.substring(0, 10) + '...\n');

  // Test 1: Upsert customer
  const customerId = await testUpsertCustomer();
  
  // Test 2: Event processing (if customer was created)
  if (customerId) {
    await testEvent(customerId);
  }
  
  // Test 3: Unauthorized access
  await testUnauthorized();

  console.log('\n🎉 All tests completed!');
}

runTests().catch(console.error);
