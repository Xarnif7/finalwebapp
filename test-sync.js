import fetch from 'node-fetch';

async function testSync() {
  try {
    console.log('=== TESTING REVIEW SYNC ===');
    
    // Test the sync endpoint directly
    const response = await fetch('https://myblipp.com/api/reviews/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to get a valid auth token
      },
      body: JSON.stringify({
        business_id: 'test-business-id',
        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4', // Google's headquarters as test
        platform: 'google',
        limit: 5
      })
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSync();
