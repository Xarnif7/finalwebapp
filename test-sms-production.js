import fetch from 'node-fetch';

async function testSMSProduction() {
  try {
    console.log('🧪 Testing SMS in Production...\n');
    
    // Test 1: Check if SMS status endpoint works
    console.log('1️⃣ Testing SMS status endpoint...');
    try {
      const statusResponse = await fetch('https://myblipp.com/api/surge/sms/status?businessId=test', {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      
      console.log(`   Status: ${statusResponse.status}`);
      if (statusResponse.status === 401) {
        console.log('   ✅ Endpoint exists (401 expected without valid token)');
      } else {
        const data = await statusResponse.json();
        console.log('   Response:', data);
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }
    
    // Test 2: Check if SMS send endpoint exists
    console.log('\n2️⃣ Testing SMS send endpoint...');
    try {
      const sendResponse = await fetch('https://myblipp.com/api/surge/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          businessId: 'test',
          to: '+1234567890',
          body: 'test message'
        })
      });
      
      console.log(`   Status: ${sendResponse.status}`);
      if (sendResponse.status === 401 || sendResponse.status === 400) {
        console.log('   ✅ Endpoint exists (401/400 expected without valid data)');
      } else {
        const data = await sendResponse.json();
        console.log('   Response:', data);
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }
    
    // Test 3: Check if test endpoint works
    console.log('\n3️⃣ Testing SMS test endpoint...');
    try {
      const testResponse = await fetch('https://myblipp.com/api/test-sms-endpoint');
      const testData = await testResponse.json();
      console.log(`   Status: ${testResponse.status}`);
      console.log('   Response:', testData);
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Go to your production dashboard');
    console.log('   2. Open browser console (F12)');
    console.log('   3. Try sending an SMS from Private Feedback');
    console.log('   4. Check the console logs for debug information');
    console.log('   5. Look for "SMS Debug" messages to see what data is being passed');
    
  } catch (error) {
    console.error('❌ Error testing SMS production:', error);
  }
}

testSMSProduction();
