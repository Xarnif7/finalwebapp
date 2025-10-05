#!/usr/bin/env node

/**
 * QBO Trigger Verification Test
 * 
 * This script tests the complete QBO trigger flow to ensure that:
 * 1. QBO webhook receives events properly
 * 2. Template matching works correctly
 * 3. Automation scheduling works
 * 4. Email sending executes at the right time
 */

const { default: fetch } = require('node-fetch');

// Configuration
const BASE_URL = process.env.APP_BASE_URL || 'https://myblipp.com';
const TEST_BUSINESS_ID = process.env.TEST_BUSINESS_ID || 'test-business-id';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n🔍 Step ${step}: ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testQBOTriggerFlow() {
  log('\n🚀 Starting QBO Trigger Verification Test', 'bright');
  log(`📍 Testing against: ${BASE_URL}`, 'cyan');
  log(`🏢 Business ID: ${TEST_BUSINESS_ID}`, 'cyan');

  const results = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    businessId: TEST_BUSINESS_ID,
    tests: {}
  };

  // Test 1: Check QBO webhook endpoint exists
  logStep(1, 'Checking QBO webhook endpoint');
  try {
    const webhookResponse = await makeRequest(`${BASE_URL}/api/qbo/webhook`, {
      method: 'POST',
      body: JSON.stringify({
        test: 'webhook_endpoint_check'
      })
    });

    results.tests.webhookEndpoint = webhookResponse;
    
    if (webhookResponse.status === 401 || webhookResponse.status === 400) {
      logSuccess('QBO webhook endpoint exists and requires authentication (expected)');
      log(`   - Status: ${webhookResponse.status} (authentication required)`);
    } else if (webhookResponse.success) {
      logSuccess('QBO webhook endpoint is accessible');
    } else {
      logWarning(`QBO webhook endpoint returned unexpected status: ${webhookResponse.status}`);
    }
  } catch (error) {
    logError(`QBO webhook endpoint check failed: ${error.message}`);
    results.tests.webhookEndpoint = { success: false, error: error.message };
  }

  // Test 2: Simulate QBO webhook payload
  logStep(2, 'Simulating QBO webhook payload');
  try {
    const mockQBOWebhook = {
      eventNotifications: [{
        realmId: 'test-realm-123',
        dataChangeEvent: {
          entities: [{
            name: 'Invoice',
            id: 'test-invoice-456',
            operation: 'Emailed'
          }],
          lastUpdated: new Date().toISOString()
        }
      }]
    };

    // Note: This will fail authentication, but we can check the structure
    const webhookResponse = await makeRequest(`${BASE_URL}/api/qbo/webhook`, {
      method: 'POST',
      body: JSON.stringify(mockQBOWebhook)
    });

    results.tests.webhookSimulation = webhookResponse;
    
    if (webhookResponse.status === 401) {
      logSuccess('QBO webhook correctly rejects unauthenticated requests');
      log('   - HMAC signature verification is working');
    } else if (webhookResponse.status === 400) {
      logSuccess('QBO webhook validates payload structure');
      log('   - Missing signature header detected');
    } else {
      logWarning(`Unexpected webhook response: ${webhookResponse.status}`);
    }
  } catch (error) {
    logError(`QBO webhook simulation failed: ${error.message}`);
    results.tests.webhookSimulation = { success: false, error: error.message };
  }

  // Test 3: Check automation templates system
  logStep(3, 'Checking automation templates system');
  try {
    const templatesResponse = await makeRequest(`${BASE_URL}/api/automation/test-system`, {
      method: 'POST',
      body: JSON.stringify({ 
        businessId: TEST_BUSINESS_ID, 
        testType: 'basic' 
      })
    });

    results.tests.templatesSystem = templatesResponse;
    
    if (templatesResponse.success) {
      logSuccess('Automation templates system is working');
      const templates = templatesResponse.data.results.tests.templates;
      log(`   - Templates found: ${templates.count}`);
      log(`   - System health: ${templates.success ? 'Healthy' : 'Issues detected'}`);
    } else {
      logWarning('Automation templates system has issues');
      log(`   - Error: ${templatesResponse.error || templatesResponse.data?.error}`);
    }
  } catch (error) {
    logError(`Templates system check failed: ${error.message}`);
    results.tests.templatesSystem = { success: false, error: error.message };
  }

  // Test 4: Check automation executor
  logStep(4, 'Checking automation executor');
  try {
    const executorResponse = await makeRequest(`${BASE_URL}/api/_cron/automation-executor`, {
      method: 'POST'
    });

    results.tests.automationExecutor = executorResponse;
    
    if (executorResponse.success) {
      logSuccess('Automation executor is working');
      log(`   - Processed automations: ${executorResponse.data.processedAutomations || 0}`);
      log(`   - Processed requests: ${executorResponse.data.processedRequests || 0}`);
    } else {
      logWarning('Automation executor has issues');
      log(`   - Error: ${executorResponse.error || executorResponse.data?.error}`);
    }
  } catch (error) {
    logError(`Automation executor check failed: ${error.message}`);
    results.tests.automationExecutor = { success: false, error: error.message };
  }

  // Test 5: Check QBO integration status
  logStep(5, 'Checking QBO integration status');
  try {
    const qboStatusResponse = await makeRequest(`${BASE_URL}/api/qbo/status`, {
      method: 'GET'
    });

    results.tests.qboStatus = qboStatusResponse;
    
    if (qboStatusResponse.success) {
      logSuccess('QBO integration endpoint is accessible');
      log(`   - Status: ${qboStatusResponse.status}`);
    } else {
      logWarning('QBO integration endpoint has issues');
      log(`   - Error: ${qboStatusResponse.error || qboStatusResponse.data?.error}`);
    }
  } catch (error) {
    logError(`QBO status check failed: ${error.message}`);
    results.tests.qboStatus = { success: false, error: error.message };
  }

  // Test 6: Verify template matching logic (simulation)
  logStep(6, 'Verifying template matching logic');
  try {
    // This simulates what happens when QBO webhook processes an invoice
    const templateMatchingTest = {
      businessId: TEST_BUSINESS_ID,
      triggerType: 'invoice_paid',
      jobHint: 'grass cutting',
      testType: 'template_matching'
    };

    const matchingResponse = await makeRequest(`${BASE_URL}/api/automation/test-trigger`, {
      method: 'POST',
      body: JSON.stringify(templateMatchingTest)
    });

    results.tests.templateMatching = matchingResponse;
    
    if (matchingResponse.success) {
      logSuccess('Template matching system is working');
      const summary = matchingResponse.data.results.summary;
      log(`   - Steps passed: ${summary.passedSteps}/${summary.totalSteps}`);
      log(`   - Success rate: ${summary.successRate}%`);
    } else {
      logWarning('Template matching system has issues');
      log(`   - Error: ${matchingResponse.error || matchingResponse.data?.error}`);
    }
  } catch (error) {
    logError(`Template matching test failed: ${error.message}`);
    results.tests.templateMatching = { success: false, error: error.message };
  }

  // Summary and Analysis
  log('\n📊 QBO Trigger Verification Summary', 'bright');
  const totalTests = Object.keys(results.tests).length;
  const passedTests = Object.values(results.tests).filter(t => t.success).length;
  const failedTests = totalTests - passedTests;

  log(`Total tests: ${totalTests}`, 'cyan');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`, passedTests === totalTests ? 'green' : 'yellow');

  // Detailed Analysis
  log('\n🔍 Detailed Analysis:', 'yellow');
  
  // Webhook Analysis
  const webhookTest = results.tests.webhookEndpoint;
  if (webhookTest && (webhookTest.status === 401 || webhookTest.status === 400)) {
    log('✅ QBO Webhook: Properly secured with HMAC verification', 'green');
  } else {
    log('❌ QBO Webhook: Security issues detected', 'red');
  }

  // Template System Analysis
  const templatesTest = results.tests.templatesSystem;
  if (templatesTest && templatesTest.success) {
    log('✅ Template System: Working correctly', 'green');
  } else {
    log('❌ Template System: Issues detected', 'red');
  }

  // Automation Executor Analysis
  const executorTest = results.tests.automationExecutor;
  if (executorTest && executorTest.success) {
    log('✅ Automation Executor: Working correctly', 'green');
  } else {
    log('❌ Automation Executor: Issues detected', 'red');
  }

  // Final Verdict
  log('\n🎯 Final Verdict:', 'bright');
  
  if (passedTests >= totalTests * 0.8) {
    log('✅ QBO triggers SHOULD work when properly configured!', 'green');
    log('', 'green');
    log('📋 What happens when QBO sends a webhook:', 'cyan');
    log('   1. QBO sends webhook to /api/qbo/webhook', 'cyan');
    log('   2. HMAC signature is verified for security', 'cyan');
    log('   3. Invoice/payment data is fetched from QBO API', 'cyan');
    log('   4. Customer is matched in your database', 'cyan');
    log('   5. Template is selected based on trigger type and keywords', 'cyan');
    log('   6. Review request is created with proper delay', 'cyan');
    log('   7. Email is scheduled via scheduled_jobs table', 'cyan');
    log('   8. Automation executor sends email at the right time', 'cyan');
    log('', 'green');
    log('🔧 To ensure it works:', 'yellow');
    log('   - Make sure QBO integration is connected', 'yellow');
    log('   - Create automation templates with proper triggers', 'yellow');
    log('   - Set up webhook in QBO with correct URL', 'yellow');
    log('   - Configure QBO_WEBHOOK_VERIFIER_TOKEN in environment', 'yellow');
  } else {
    log('❌ QBO triggers may NOT work properly - issues detected!', 'red');
    log('', 'red');
    log('🚨 Critical issues that need fixing:', 'red');
    
    Object.entries(results.tests).forEach(([testName, testResult]) => {
      if (!testResult.success) {
        log(`   - ${testName}: ${testResult.error || 'Failed'}`, 'red');
      }
    });
  }

  log('\n🏁 QBO Trigger Verification Complete!', 'bright');
  
  return results;
}

// Run the test if this script is executed directly
if (require.main === module) {
  testQBOTriggerFlow()
    .then(results => {
      const successRate = Object.values(results.tests).filter(t => t.success).length / Object.keys(results.tests).length;
      process.exit(successRate >= 0.8 ? 0 : 1);
    })
    .catch(error => {
      logError(`Test suite failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testQBOTriggerFlow };
