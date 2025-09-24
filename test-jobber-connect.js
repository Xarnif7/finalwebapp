import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testJobberConnect() {
  console.log('🧪 Testing Jobber Connect Endpoint...\n');
  
  try {
    // Test the connect endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://myblipp.com'}/api/crm/jobber/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_id: '3a007547-a063-4f63-be40-bb46eee30763', // Use your actual business ID
        user_id: 'test-user-id'
      })
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Connect endpoint response:', data);
      
      if (data.authUrl) {
        console.log('🔗 Generated OAuth URL:', data.authUrl);
        console.log('🎯 This URL should open Jobber OAuth in a new window');
        
        // Check if the URL looks correct
        if (data.authUrl.includes('api.getjobber.com/api/oauth/authorize')) {
          console.log('✅ OAuth URL format looks correct');
        } else {
          console.log('❌ OAuth URL format looks incorrect');
        }
      } else {
        console.log('❌ No authUrl in response');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Connect endpoint failed:', response.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function main() {
  await testJobberConnect();
  console.log('\n✅ Connect test completed!');
}

main().catch(console.error);
