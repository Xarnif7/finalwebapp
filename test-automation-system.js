#!/usr/bin/env node

/**
 * Comprehensive Automation System Test
 * 
 * This script tests the entire automation system end-to-end:
 * 1. Template creation and management
 * 2. Automation triggering
 * 3. Email scheduling and execution
 * 4. Status tracking and reporting
 */

import fetch from 'node-fetch';

// Configuration
const BASE_URL = process.env.APP_BASE_URL || 'https://myblipp.com';
const TEST_BUSINESS_ID = process.env.TEST_BUSINESS_ID || 'test-business-id';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

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

async function testAutomationSystem() {
  log('\n🚀 Starting Comprehensive Automation System Test', 'bright');
  log(`📍 Testing against: ${BASE_URL}`, 'cyan');
  log(`🏢 Business ID: ${TEST_BUSINESS_ID}`, 'cyan');
  log(`📧 Test Email: ${TEST_EMAIL}`, 'cyan');

  const results = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    businessId: TEST_BUSINESS_ID,
    tests: {}
  };

  // Test 1: System Health Check
  logStep(1, 'System Health Check');
  try {
    const healthResponse = await makeRequest(`${BASE_URL}/api/automation/test-system`, {
      method: 'POST',
      body: JSON.stringify({ businessId: TEST_BUSINESS_ID, testType: 'basic' })
    });

    results.tests.systemHealth = healthResponse;
    
    if (healthResponse.success) {
      logSuccess('System health check passed');
      log(`   - Business exists: ${healthResponse.data.results.tests.businessExists.success}`);
      log(`   - Templates count: ${healthResponse.data.results.tests.templates.count}`);
      log(`   - Customers count: ${healthResponse.data.results.tests.customers.count}`);
    } else {
      logError(`System health check failed: ${healthResponse.error || healthResponse.data?.error}`);
    }
  } catch (error) {
    logError(`System health check error: ${error.message}`);
    results.tests.systemHealth = { success: false, error: error.message };
  }

  // Test 2: Template Creation
  logStep(2, 'Template Creation');
  try {
    const templateData = {
      name: 'Test Automation Template',
      description: 'This is a test automation template created by the test suite',
      channels: ['email'],
      trigger_type: 'event',
      config_json: {
        message: 'Thank you for testing our automation system! This is a test message.',
        delay_hours: 0 // Immediate execution for testing
      }
    };

    const createResponse = await makeRequest(`${BASE_URL}/api/templates/${TEST_BUSINESS_ID}`, {
      method: 'POST',
      body: JSON.stringify(templateData)
    });

    results.tests.templateCreation = createResponse;

    if (createResponse.success) {
      logSuccess('Template created successfully');
      log(`   - Template ID: ${createResponse.data.template.id}`);
      log(`   - Template Name: ${createResponse.data.template.name}`);
      results.testTemplateId = createResponse.data.template.id;
    } else {
      logError(`Template creation failed: ${createResponse.error || createResponse.data?.error}`);
    }
  } catch (error) {
    logError(`Template creation error: ${error.message}`);
    results.tests.templateCreation = { success: false, error: error.message };
  }

  // Test 3: Automation Trigger Test
  logStep(3, 'Automation Trigger Test');
  try {
    const triggerData = {
      businessId: TEST_BUSINESS_ID,
      templateId: results.testTemplateId,
      triggerType: 'manual_test',
      testEmail: TEST_EMAIL
    };

    const triggerResponse = await makeRequest(`${BASE_URL}/api/automation/test-trigger`, {
      method: 'POST',
      body: JSON.stringify(triggerData)
    });

    results.tests.automationTrigger = triggerResponse;

    if (triggerResponse.success) {
      logSuccess('Automation trigger test completed');
      log(`   - Steps passed: ${triggerResponse.data.results.summary.passedSteps}/${triggerResponse.data.results.summary.totalSteps}`);
      log(`   - Success rate: ${triggerResponse.data.results.summary.successRate}%`);
      
      if (triggerResponse.data.results.steps) {
        triggerResponse.data.results.steps.forEach((step, index) => {
          const status = step.success ? '✅' : '❌';
          log(`   - ${status} ${step.step}: ${step.success ? 'Success' : step.error}`);
        });
      }
    } else {
      logError(`Automation trigger test failed: ${triggerResponse.error || triggerResponse.data?.error}`);
    }
  } catch (error) {
    logError(`Automation trigger test error: ${error.message}`);
    results.tests.automationTrigger = { success: false, error: error.message };
  }

  // Test 4: Automation Executor Test
  logStep(4, 'Automation Executor Test');
  try {
    const executorResponse = await makeRequest(`${BASE_URL}/api/_cron/automation-executor`, {
      method: 'POST'
    });

    results.tests.automationExecutor = executorResponse;

    if (executorResponse.success) {
      logSuccess('Automation executor ran successfully');
      log(`   - Processed automations: ${executorResponse.data.processedAutomations}`);
      log(`   - Processed requests: ${executorResponse.data.processedRequests}`);
      log(`   - Message: ${executorResponse.data.message}`);
    } else {
      logError(`Automation executor failed: ${executorResponse.error || executorResponse.data?.error}`);
    }
  } catch (error) {
    logError(`Automation executor error: ${error.message}`);
    results.tests.automationExecutor = { success: false, error: error.message };
  }

  // Test 5: Final System Status
  logStep(5, 'Final System Status Check');
  try {
    const finalStatusResponse = await makeRequest(`${BASE_URL}/api/automation/test-system`, {
      method: 'POST',
      body: JSON.stringify({ businessId: TEST_BUSINESS_ID, testType: 'full' })
    });

    results.tests.finalStatus = finalStatusResponse;

    if (finalStatusResponse.success) {
      logSuccess('Final status check completed');
      const summary = finalStatusResponse.data.results.summary;
      log(`   - Tests passed: ${summary.passedTests}/${summary.totalTests}`);
      log(`   - Success rate: ${summary.successRate}%`);
      
      // Show detailed results
      Object.entries(finalStatusResponse.data.results.tests).forEach(([testName, testResult]) => {
        const status = testResult.success ? '✅' : '❌';
        log(`   - ${status} ${testName}: ${testResult.success ? 'Success' : testResult.error}`);
      });
    } else {
      logError(`Final status check failed: ${finalStatusResponse.error || finalStatusResponse.data?.error}`);
    }
  } catch (error) {
    logError(`Final status check error: ${error.message}`);
    results.tests.finalStatus = { success: false, error: error.message };
  }

  // Summary
  log('\n📊 Test Summary', 'bright');
  const totalTests = Object.keys(results.tests).length;
  const passedTests = Object.values(results.tests).filter(t => t.success).length;
  const failedTests = totalTests - passedTests;

  log(`Total tests: ${totalTests}`, 'cyan');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`, passedTests === totalTests ? 'green' : 'yellow');

  if (failedTests > 0) {
    log('\n❌ Failed Tests:', 'red');
    Object.entries(results.tests).forEach(([testName, testResult]) => {
      if (!testResult.success) {
        log(`   - ${testName}: ${testResult.error || testResult.data?.error}`, 'red');
      }
    });
  }

  // Recommendations
  log('\n💡 Recommendations:', 'yellow');
  if (passedTests === totalTests) {
    log('   🎉 All tests passed! The automation system is working perfectly.', 'green');
    log('   ✅ You can now use the automation system in production.', 'green');
  } else if (passedTests >= totalTests * 0.8) {
    log('   ⚠️  Most tests passed, but there are some issues to address.', 'yellow');
    log('   🔧 Check the failed tests and fix the underlying issues.', 'yellow');
  } else {
    log('   ❌ Multiple tests failed. The automation system needs significant work.', 'red');
    log('   🚨 Do not use in production until all issues are resolved.', 'red');
  }

  log('\n🏁 Test completed!', 'bright');
  
  return results;
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAutomationSystem()
    .then(results => {
      process.exit(Object.values(results.tests).every(t => t.success) ? 0 : 1);
    })
    .catch(error => {
      logError(`Test suite failed: ${error.message}`);
      process.exit(1);
    });
}

export { testAutomationSystem };
