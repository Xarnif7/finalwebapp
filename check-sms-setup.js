import fetch from 'node-fetch';

async function checkSMSSetup() {
  try {
    console.log('🔍 Checking SMS setup...');
    
    // Check if we have the required environment variables
    const requiredEnvVars = [
      'SURGE_API_KEY',
      'SURGE_MASTER_ACCOUNT_ID', 
      'SURGE_API_BASE',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    console.log('\n📋 Environment Variables:');
    requiredEnvVars.forEach(envVar => {
      const value = process.env[envVar];
      console.log(`  ${envVar}: ${value ? '✅ Set' : '❌ Missing'}`);
      if (value && envVar.includes('KEY')) {
        console.log(`    Value: ${value.substring(0, 10)}...`);
      }
    });
    
    // Test Surge API connection
    console.log('\n🌊 Testing Surge API connection...');
    try {
      const surgeResponse = await fetch(`${process.env.SURGE_API_BASE}/v1/accounts`, {
        headers: {
          'Authorization': `Bearer ${process.env.SURGE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (surgeResponse.ok) {
        const surgeData = await surgeResponse.json();
        console.log('  ✅ Surge API connection successful');
        console.log(`  📊 Found ${surgeData.data?.length || 0} accounts`);
      } else {
        console.log('  ❌ Surge API connection failed:', surgeResponse.status);
      }
    } catch (error) {
      console.log('  ❌ Surge API error:', error.message);
    }
    
    // Test SMS endpoint
    console.log('\n📱 Testing SMS endpoint...');
    try {
      const smsResponse = await fetch('https://myblipp.com/api/test-sms-endpoint');
      if (smsResponse.ok) {
        console.log('  ✅ SMS endpoint is accessible');
      } else {
        console.log('  ❌ SMS endpoint failed:', smsResponse.status);
      }
    } catch (error) {
      console.log('  ❌ SMS endpoint error:', error.message);
    }
    
    console.log('\n🎯 Next steps:');
    console.log('  1. Make sure your business has a phone number configured');
    console.log('  2. Check that the phone number is verified with Surge');
    console.log('  3. Ensure surge_account_id is set in the businesses table');
    
  } catch (error) {
    console.error('❌ Error checking SMS setup:', error);
  }
}

checkSMSSetup();
