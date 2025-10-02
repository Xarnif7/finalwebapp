// Simple test to verify the API works
const testAPI = async () => {
  try {
    const response = await fetch('https://myblipp.com/api/send-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId: 'test-business',
        customerId: 'test-customer',
        templateId: 'test-template',
        message: 'Test message',
        channel: 'email',
        to: 'test@example.com'
      })
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error testing API:', error);
  }
};

testAPI();
