// Test backend APIs
const testAutomationTrigger = async () => {
  try {
    console.log('🧪 Testing automation trigger API...');
    
    const response = await fetch('https://myblipp.com/api/automation/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        customer_id: 'test-customer',
        trigger_type: 'manual_trigger',
        trigger_data: {
          template_id: 'test-template',
          template_name: 'Test Template',
          message: 'Test message'
        }
      })
    });
    
    console.log('📊 Response status:', response.status);
    const data = await response.text();
    console.log('📋 Response data:', data);
    
    if (response.ok) {
      console.log('✅ Automation trigger API is working!');
    } else {
      console.log('❌ Automation trigger API failed');
    }
  } catch (error) {
    console.error('❌ Error testing automation trigger:', error);
  }
};

const testHealthEndpoint = async () => {
  try {
    console.log('🧪 Testing health endpoint...');
    
    const response = await fetch('https://myblipp.com/api/health');
    console.log('📊 Health response status:', response.status);
    const data = await response.text();
    console.log('📋 Health response:', data);
    
    if (response.ok) {
      console.log('✅ Health endpoint is working!');
    } else {
      console.log('❌ Health endpoint failed');
    }
  } catch (error) {
    console.error('❌ Error testing health endpoint:', error);
  }
};

// Run tests
testHealthEndpoint().then(() => {
  testAutomationTrigger();
});
