#!/usr/bin/env node

/**
 * Simple API Test for Reviews System
 * Tests basic endpoints without external dependencies
 */

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

console.log('🧪 Testing Reviews System API Endpoints');
console.log('=' .repeat(50));

// Test function
async function testEndpoint(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n🔍 Testing: ${method} ${endpoint}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ SUCCESS: ${endpoint}`);
      if (data.success !== undefined) {
        console.log(`   Response success: ${data.success}`);
      }
      return { success: true, data };
    } else {
      console.log(`   ❌ FAILED: ${endpoint} - ${response.status}`);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${endpoint} - ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main test runner
async function runTests() {
  const results = [];
  
  // Test basic endpoints
  results.push(await testEndpoint('/api/reviews'));
  results.push(await testEndpoint('/api/reviews/connect-source', 'POST', {
    platform: 'google',
    public_url: 'https://test.com',
    business_name: 'Test Business',
    external_id: 'test123',
    place_id: 'test_place_id'
  }));
  
  results.push(await testEndpoint('/api/ai/generate-review-response', 'POST', {
    review_text: 'Great service!',
    rating: 5,
    platform: 'google',
    business_name: 'Test Business',
    sentiment: 'positive'
  }));
  
  results.push(await testEndpoint('/api/ai/classify-review', 'POST', {
    review_text: 'Terrible service!',
    rating: 1,
    platform: 'google'
  }));
  
  results.push(await testEndpoint('/api/reviews/update', 'POST', {
    review_id: 'test_id',
    updates: { status: 'read' }
  }));
  
  // Summary
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL API ENDPOINTS ARE WORKING!');
  } else {
    console.log('\n⚠️  Some endpoints failed. Check server logs.');
  }
}

// Run tests
runTests().catch(console.error);
