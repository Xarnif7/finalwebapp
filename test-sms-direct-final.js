import fetch from 'node-fetch';

async function testDirectSMS() {
  try {
    console.log('🧪 Testing Direct SMS (bypassing business lookup)...\n');
    
    const testData = {
      to: '(417) 973-2866',
      body: 'Test SMS from Blipp - this should work!'
    };
    
    console.log('📱 Sending test SMS to:', testData.to);
    console.log('📝 Message:', testData.body);
    
    const response = await fetch('https://myblipp.com/api/test-sms-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`\n📊 Response Status: ${response.status}`);
    
    const result = await response.json();
    console.log('📋 Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ SMS sent successfully!');
      console.log(`📱 Message ID: ${result.message_id}`);
      console.log(`📞 To: ${result.to}`);
    } else {
      console.log('\n❌ SMS failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing direct SMS:', error);
  }
}

testDirectSMS();
