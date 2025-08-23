// Simple test script to verify API endpoints
const testApi = async () => {
  try {
    console.log('Testing API endpoints...');
    
    // Test subscription status endpoint
    console.log('\n1. Testing subscription status endpoint...');
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
    
    // Test Stripe checkout endpoint
    console.log('\n2. Testing Stripe checkout endpoint...');
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
