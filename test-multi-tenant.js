// Test script to verify multi-tenant setup
import fetch from 'node-fetch';

async function testMultiTenant() {
  console.log('🧪 Testing Multi-Tenant Setup...\n');

  // Test 1: Zapier Ping
  console.log('1. Testing Zapier Ping...');
  try {
    const pingResponse = await fetch('https://myblipp.com/api/zapier/ping', {
      headers: {
        'X-Zapier-Token': 'blipp_ZapierToken_6f8e9a7c12d84b3f91aa4c0e7d5f3a28'
      }
    });
    const pingData = await pingResponse.json();
    console.log('   ✅ Ping:', pingData);
  } catch (error) {
    console.log('   ❌ Ping failed:', error.message);
  }

  // Test 2: Zapier Customer Upsert
  console.log('\n2. Testing Zapier Customer Upsert...');
  try {
    const customerData = {
      external_id: 'test_customer_' + Date.now(),
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      tags: ['test', 'zapier'],
      source: 'zapier',
      event_ts: new Date().toISOString()
    };

    const upsertResponse = await fetch('https://myblipp.com/api/zapier/upsert-customer', {
      method: 'POST',
      headers: {
        'X-Zapier-Token': 'blipp_ZapierToken_6f8e9a7c12d84b3f91aa4c0e7d5f3a28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customerData)
    });
    
    const responseText = await upsertResponse.text();
    console.log('   Response Status:', upsertResponse.status);
    console.log('   Response Text:', responseText);
    
    try {
      const upsertData = JSON.parse(responseText);
      console.log('   ✅ Customer Upsert:', upsertData);
    } catch (parseError) {
      console.log('   ❌ JSON Parse Error:', parseError.message);
    }
  } catch (error) {
    console.log('   ❌ Customer Upsert failed:', error.message);
  }

  // Test 3: Zapier Review Request
  console.log('\n3. Testing Zapier Review Request...');
  try {
    const reviewData = {
      external_id: 'test_review_' + Date.now(),
      email: 'john.doe@example.com',
      phone: '+1234567890',
      first_name: 'John',
      last_name: 'Doe',
      job_id: 'job_123',
      job_type: 'Service',
      invoice_id: 'inv_123',
      invoice_total: 100.00,
      event_ts: new Date().toISOString()
    };

    const reviewResponse = await fetch('https://myblipp.com/api/zapier/review-request', {
      method: 'POST',
      headers: {
        'X-Zapier-Token': 'blipp_ZapierToken_6f8e9a7c12d84b3f91aa4c0e7d5f3a28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reviewData)
    });
    const reviewDataResult = await reviewResponse.json();
    console.log('   ✅ Review Request:', reviewDataResult);
  } catch (error) {
    console.log('   ❌ Review Request failed:', error.message);
  }

  console.log('\n🎉 Multi-tenant testing complete!');
}

testMultiTenant().catch(console.error);
