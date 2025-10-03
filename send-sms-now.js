import fetch from 'node-fetch';

async function sendSMSNow() {
  try {
    console.log('🚀 Sending SMS RIGHT NOW...\n');
    
    const phone = '(417) 973-2866';
    const message = 'Hi Lisa, thanks for your feedback! We\'re glad you had a good experience. Let us know if we can help with anything else.';
    
    // Use your Surge configuration
    const surgeApiKey = process.env.SURGE_API_KEY;
    const surgeApiBase = 'https://api.surge.app';
    const fromNumber = '+18775402797';
    const surgeAccountId = process.env.SURGE_MASTER_ACCOUNT_ID;
    
    if (!surgeApiKey || !surgeApiBase) {
      console.error('❌ Surge API not configured');
      return;
    }
    
    // Normalize phone number
    const normalizedTo = phone.replace(/\D/g, '');
    const e164Phone = normalizedTo.startsWith('1') ? `+${normalizedTo}` : `+1${normalizedTo}`;
    
    console.log(`📱 Sending from: ${fromNumber}`);
    console.log(`📱 Sending to: ${e164Phone}`);
    console.log(`📝 Message: ${message}`);
    console.log(`🔑 Account ID: ${surgeAccountId}\n`);
    
    const response = await fetch(`${surgeApiBase}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${surgeApiKey}`,
        'Surge-Account': surgeAccountId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        account_id: surgeAccountId,
        from: fromNumber,
        to: e164Phone,
        body: message + '\n\nReply STOP to opt out. Reply HELP for help.'
      })
    });
    
    const result = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log('📋 Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ SMS SENT SUCCESSFULLY!');
      console.log(`📱 Message ID: ${result.message_id || result.id}`);
      console.log(`📞 To: ${e164Phone}`);
      console.log('🎉 Check your phone for the text message!');
    } else {
      console.log('\n❌ SMS FAILED:', result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

sendSMSNow();
