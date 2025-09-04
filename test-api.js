// Simple test script to verify API endpoints
const testApi = async () => {
  try {
    console.log('Testing API endpoints...');
    
    // Test subscription status health endpoint (no auth required)
    console.log('\n1. Testing subscription status health endpoint...');
    const healthResponse = await fetch('http://localhost:3000/api/subscription/status?health=1', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Health response status:', healthResponse.status);
    const healthData = await healthResponse.json();
    console.log('Health response data:', healthData);
    
    // Test subscription status endpoint (requires auth)
    console.log('\n2. Testing subscription status endpoint (with invalid token)...');
    const response = await fetch('http://localhost:3000/api/subscription/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
    // Test Stripe checkout diagnostics endpoint (no auth required)
    console.log('\n3. Testing Stripe checkout diagnostics endpoint...');
    const diagResponse = await fetch('http://localhost:3000/api/stripe/checkout?diag=1', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Diagnostics response status:', diagResponse.status);
    const diagData = await diagResponse.json();
    console.log('Diagnostics response data:', diagData);
    
    // Test Stripe checkout endpoint (requires auth)
    console.log('\n4. Testing Stripe checkout endpoint (with invalid token)...');
    const checkoutResponse = await fetch('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({ planTier: 'basic' })
    });
    
    console.log('Checkout response status:', checkoutResponse.status);
    const checkoutData = await checkoutResponse.json();
    console.log('Checkout response data:', checkoutData);
    
  } catch (error) {
    console.error('API test failed:', error);
  }
};

// Run the test
testApi();
