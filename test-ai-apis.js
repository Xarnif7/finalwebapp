// Test script to verify AI API endpoints are working
import fetch from 'node-fetch';

const BASE_URL = 'https://myblipp.com';

async function testAIGeneration() {
  console.log('🧪 Testing AI Generation API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/generate-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_name: 'Job Completed',
        template_type: 'job_completed',
        business_id: 'test-business-id',
        automation_type: 'job_completed'
      })
    });

    const data = await response.json();
    console.log('✅ AI Generation Response:', data);
    return data.success;
  } catch (error) {
    console.error('❌ AI Generation Error:', error.message);
    return false;
  }
}

async function testAIEnhancement() {
  console.log('🧪 Testing AI Enhancement API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/enhance-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        current_message: 'Hi, thanks for the work!',
        template_name: 'Job Completed',
        template_type: 'job_completed',
        business_id: 'test-business-id'
      })
    });

    const data = await response.json();
    console.log('✅ AI Enhancement Response:', data);
    return data.success;
  } catch (error) {
    console.error('❌ AI Enhancement Error:', error.message);
    return false;
  }
}

async function testCustomerPreview() {
  console.log('🧪 Testing Customer Preview API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/customers/preview-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_id: 'test-business-id'
      })
    });

    const data = await response.json();
    console.log('✅ Customer Preview Response:', data);
    return data.success;
  } catch (error) {
    console.error('❌ Customer Preview Error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting AI API Tests...\n');
  
  const results = {
    generation: await testAIGeneration(),
    enhancement: await testAIEnhancement(),
    preview: await testCustomerPreview()
  };
  
  console.log('\n📊 Test Results:');
  console.log(`AI Generation: ${results.generation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`AI Enhancement: ${results.enhancement ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Customer Preview: ${results.preview ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n🎯 Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
}

runTests();
