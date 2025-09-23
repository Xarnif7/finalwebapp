#!/usr/bin/env node

// Test script to check automation system status
const https = require('https');

console.log('🔍 Testing Automation System Status...\n');

async function testAutomationExecutor() {
  try {
    console.log('📡 Calling automation executor API...');
    
    const response = await fetch('https://myblipp.com/api/_cron/automation-executor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log('✅ API Response:', JSON.stringify(data, null, 2));
    
    if (data.processedAutomations > 0) {
      console.log(`🎉 ${data.processedAutomations} automation jobs processed!`);
    } else {
      console.log('ℹ️  No automation jobs to process at this time');
    }
    
    if (data.processedRequests > 0) {
      console.log(`📧 ${data.processedRequests} review requests processed!`);
    }
    
  } catch (error) {
    console.error('❌ Error testing automation executor:', error.message);
  }
}

// Run the test
testAutomationExecutor();
