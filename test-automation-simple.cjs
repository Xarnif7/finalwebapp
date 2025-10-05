#!/usr/bin/env node

/**
 * Simple Automation System Test
 * Tests basic automation functionality
 */

const { default: fetch } = require('node-fetch');

// Configuration
const BASE_URL = 'https://myblipp.com';

async function testBasicAutomation() {
  console.log('🚀 Testing Automation System...');
  
  try {
    // Test 1: Check automation executor endpoint
    console.log('\n🔍 Testing automation executor...');
    const response = await fetch(`${BASE_URL}/api/_cron/automation-executor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Automation executor is working');
      console.log(`   - Status: ${response.status}`);
      console.log(`   - Processed automations: ${data.processedAutomations || 0}`);
      console.log(`   - Processed requests: ${data.processedRequests || 0}`);
      console.log(`   - Message: ${data.message || 'No message'}`);
    } else {
      console.log('❌ Automation executor failed');
      console.log(`   - Status: ${response.status}`);
      console.log(`   - Error: ${data.error || 'Unknown error'}`);
    }

    // Test 2: Check if system is responsive
    console.log('\n🔍 Testing system responsiveness...');
    const healthResponse = await fetch(`${BASE_URL}/api/automation/test-system`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        businessId: 'test-business', 
        testType: 'basic' 
      })
    });

    if (healthResponse.ok) {
      console.log('✅ System health check endpoint is working');
    } else {
      console.log('❌ System health check failed');
      console.log(`   - Status: ${healthResponse.status}`);
    }

    console.log('\n🏁 Basic automation test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testBasicAutomation();
