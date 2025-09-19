const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';
const ZAPIER_TOKEN = process.env.ZAPIER_TOKEN || 'test_zapier_token_123';

async function testEndpoints() {
  console.log('🧪 Testing Zapier endpoints...\n');

  // Test 1: Upsert customer
  console.log('1. Testing upsert customer...');
  try {
    const response = await fetch(`${BASE_URL}/api/zapier/upsert-customer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Zapier-Token': ZAPIER_TOKEN
      },
      body: JSON.stringify({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        external_id: 'ext_123',
        tags: ['test', 'zapier'],
        source: 'google_sheets'
      })
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.ok) {
      console.log('✅ Upsert customer test passed!\n');
      
      // Test 2: Event processing
      console.log('2. Testing event processing...');
      const eventResponse = await fetch(`${BASE_URL}/api/zapier/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zapier-Token': ZAPIER_TOKEN
        },
        body: JSON.stringify({
          event_type: 'job_completed',
          email: 'test@example.com',
          service_date: new Date().toISOString().split('T')[0],
          payload: {
            job_id: 'job_123',
            amount: 150.00
          }
        })
      });

      const eventResult = await eventResponse.json();
      console.log('Status:', eventResponse.status);
      console.log('Response:', JSON.stringify(eventResult, null, 2));
      
      if (eventResponse.ok && eventResult.ok) {
        console.log('✅ Event processing test passed!\n');
      } else {
        console.log('❌ Event processing test failed!\n');
      }
    } else {
      console.log('❌ Upsert customer test failed!\n');
    }
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }

  // Test 3: Unauthorized access
  console.log('3. Testing unauthorized access...');
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
      console.log('✅ Unauthorized test passed!\n');
    } else {
      console.log('❌ Unauthorized test failed!\n');
    }
  } catch (error) {
    console.error('❌ Unauthorized test error:', error.message);
  }

  console.log('🎉 All tests completed!');
}

testEndpoints().catch(console.error);
