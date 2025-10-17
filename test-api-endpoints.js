// Test API Endpoints for Automation System
// Tests the core API endpoints without requiring environment variables

async function testAPIEndpoints() {
  console.log('🧪 Testing API Endpoints...\n');

  const baseURL = 'http://localhost:3000';
  const testResults = [];

  // Test 1: Check if server is running
  console.log('🔍 Test 1: Checking if server is running...');
  try {
    const response = await fetch(`${baseURL}/api/health`);
    if (response.ok) {
      console.log('✅ Server is running');
      testResults.push({ test: 'Server Health', status: 'PASS' });
    } else {
      console.log('❌ Server health check failed');
      testResults.push({ test: 'Server Health', status: 'FAIL', error: response.statusText });
    }
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    testResults.push({ test: 'Server Health', status: 'FAIL', error: error.message });
  }

  // Test 2: Test sequences API (GET)
  console.log('\n📋 Test 2: Testing sequences API (GET)...');
  try {
    const response = await fetch(`${baseURL}/api/sequences`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Sequences API working');
      console.log('   - Found sequences:', data.sequences?.length || 0);
      testResults.push({ test: 'Sequences GET', status: 'PASS' });
    } else {
      console.log('❌ Sequences API failed:', response.status, response.statusText);
      testResults.push({ test: 'Sequences GET', status: 'FAIL', error: response.statusText });
    }
  } catch (error) {
    console.log('❌ Sequences API error:', error.message);
    testResults.push({ test: 'Sequences GET', status: 'FAIL', error: error.message });
  }

  // Test 3: Test sequences API (POST)
  console.log('\n📝 Test 3: Testing sequences API (POST)...');
  try {
    const testSequence = {
      name: 'Test API Sequence',
      description: 'Test sequence created via API',
      trigger_type: 'manual',
      trigger_event_type: 'manual',
      allow_manual_enroll: true,
      status: 'active',
      steps: [
        {
          kind: 'send_email',
          step_index: 1,
          wait_ms: 0,
          message_purpose: 'review_request',
          message_config: {
            subject: 'Test Email',
            body: 'This is a test email from the API test.'
          }
        }
      ]
    };

    const response = await fetch(`${baseURL}/api/sequences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(testSequence)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Sequences POST API working');
      console.log('   - Created sequence ID:', data.sequenceId);
      testResults.push({ test: 'Sequences POST', status: 'PASS', sequenceId: data.sequenceId });
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Sequences POST API failed:', response.status, errorData.error || response.statusText);
      testResults.push({ test: 'Sequences POST', status: 'FAIL', error: errorData.error || response.statusText });
    }
  } catch (error) {
    console.log('❌ Sequences POST API error:', error.message);
    testResults.push({ test: 'Sequences POST', status: 'FAIL', error: error.message });
  }

  // Test 4: Test automation trigger API
  console.log('\n⚡ Test 4: Testing automation trigger API...');
  try {
    const triggerPayload = {
      business_id: 'test-business-id',
      customer_id: 'test-customer-id',
      trigger_type: 'invoice_paid',
      trigger_data: {
        invoice_id: 'test-invoice-123',
        amount: 100.00
      }
    };

    const response = await fetch(`${baseURL}/api/automation/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(triggerPayload)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Automation trigger API working');
      testResults.push({ test: 'Automation Trigger', status: 'PASS' });
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Automation trigger API failed:', response.status, errorData.error || response.statusText);
      testResults.push({ test: 'Automation Trigger', status: 'FAIL', error: errorData.error || response.statusText });
    }
  } catch (error) {
    console.log('❌ Automation trigger API error:', error.message);
    testResults.push({ test: 'Automation Trigger', status: 'FAIL', error: error.message });
  }

  // Test 5: Test email sending API
  console.log('\n📧 Test 5: Testing email sending API...');
  try {
    const emailPayload = {
      business_id: 'test-business-id',
      customer_email: 'test@example.com',
      customer_name: 'Test Customer',
      channel: 'email',
      subject: 'Test Email from API',
      body: 'This is a test email sent via the API.',
      review_link: 'https://google.com/search?q=test+review'
    };

    const response = await fetch(`${baseURL}/api/review-requests/send-now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(emailPayload)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Email sending API working');
      testResults.push({ test: 'Email Sending', status: 'PASS' });
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Email sending API failed:', response.status, errorData.error || response.statusText);
      testResults.push({ test: 'Email Sending', status: 'FAIL', error: errorData.error || response.statusText });
    }
  } catch (error) {
    console.log('❌ Email sending API error:', error.message);
    testResults.push({ test: 'Email Sending', status: 'FAIL', error: error.message });
  }

  // Test 6: Test SMS sending API
  console.log('\n📱 Test 6: Testing SMS sending API...');
  try {
    const smsPayload = {
      business_id: 'test-business-id',
      customer_phone: '+1234567890',
      customer_name: 'Test Customer',
      channel: 'sms',
      body: 'Test SMS from API',
      review_link: 'https://google.com/search?q=test+review'
    };

    const response = await fetch(`${baseURL}/api/review-requests/send-now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(smsPayload)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SMS sending API working');
      testResults.push({ test: 'SMS Sending', status: 'PASS' });
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ SMS sending API failed:', response.status, errorData.error || response.statusText);
      testResults.push({ test: 'SMS Sending', status: 'FAIL', error: errorData.error || response.statusText });
    }
  } catch (error) {
    console.log('❌ SMS sending API error:', error.message);
    testResults.push({ test: 'SMS Sending', status: 'FAIL', error: error.message });
  }

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  let passedTests = 0;
  let totalTests = testResults.length;
  
  testResults.forEach(result => {
    const status = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${status} ${result.test}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.status === 'PASS') passedTests++;
  });

  console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🚀 All API endpoints are working correctly!');
  } else {
    console.log('⚠️ Some API endpoints need attention before the demo.');
  }

  return {
    passed: passedTests,
    total: totalTests,
    results: testResults
  };
}

// Run the tests
testAPIEndpoints().then(result => {
  process.exit(result.passed === result.total ? 0 : 1);
}).catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
