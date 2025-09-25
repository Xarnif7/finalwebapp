import fetch from 'node-fetch';

async function testConnection() {
  try {
    console.log('=== TESTING BUSINESS CONNECTION ===');
    
    // Test 1: Check if there are any connected review sources
    console.log('\n1. Checking connected review sources...');
    const sourcesResponse = await fetch('https://myblipp.com/api/reviews/sources', {
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without auth, but we can see the endpoint exists
      }
    });
    
    console.log('Sources endpoint status:', sourcesResponse.status);
    
    // Test 2: Test the connect-source endpoint with a sample business
    console.log('\n2. Testing connect-source endpoint...');
    const connectResponse = await fetch('https://myblipp.com/api/reviews/connect-source', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform: 'google',
        public_url: 'https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4',
        business_name: 'Test Business',
        external_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4'
      })
    });
    
    console.log('Connect endpoint status:', connectResponse.status);
    const connectData = await connectResponse.json();
    console.log('Connect response:', connectData);
    
    // Test 3: Test the reviews endpoint
    console.log('\n3. Testing reviews endpoint...');
    const reviewsResponse = await fetch('https://myblipp.com/api/reviews?limit=15');
    
    console.log('Reviews endpoint status:', reviewsResponse.status);
    const reviewsData = await reviewsResponse.json();
    console.log('Reviews response:', reviewsData);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testConnection();
