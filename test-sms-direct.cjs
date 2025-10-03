/**
 * Direct SMS Test
 * Test SMS sending with real business data
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3001';

async function testDirectSMS() {
  console.log('🧪 Testing Direct SMS Sending...\n');

  try {
    // Test with real business ID
    const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
    const testPhone = '+1234567890'; // Test number
    const testMessage = `Test SMS from Blipp - ${new Date().toISOString()}`;

    console.log('Business ID:', businessId);
    console.log('Test Phone:', testPhone);
    console.log('Message:', testMessage);
    console.log('');

    const response = await fetch(`${BASE_URL}/api/surge/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        businessId: businessId,
        to: testPhone,
        body: testMessage
      })
    });

    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      console.log('Response Status:', response.status);
      console.log('Response Text:', await response.text());
      console.log('JSON Parse Error:', jsonError.message);
      return;
    }
    
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ SMS sent successfully!');
      console.log('Message ID:', result.message_id);
      console.log('Status:', result.status);
    } else {
      console.log('\n❌ SMS sending failed');
      console.log('Error:', result.error);
      console.log('Message:', result.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDirectSMS();
