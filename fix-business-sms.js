import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = 'https://xvzkrctudezyasinskyo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBusinessSMS() {
  try {
    console.log('🔍 Checking business and SMS setup...\n');
    
    const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
    const userId = '3671eeff-f8db-4cae-b545-7512ad1af66c';
    
    // Check if business exists
    console.log('1️⃣ Checking if business exists...');
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();
    
    if (businessError) {
      console.log('   ❌ Business not found:', businessError.message);
      
      // Check what businesses exist for this user
      console.log('\n2️⃣ Checking user businesses...');
      const { data: userBusinesses, error: userBusinessError } = await supabase
        .from('businesses')
        .select('*')
        .or(`owner_id.eq.${userId},created_by.eq.${userId}`);
      
      if (userBusinessError) {
        console.log('   ❌ Error fetching user businesses:', userBusinessError.message);
      } else {
        console.log('   📊 User businesses found:', userBusinesses?.length || 0);
        userBusinesses?.forEach(b => {
          console.log(`     - ${b.id}: ${b.name} (owner: ${b.owner_id}, created_by: ${b.created_by})`);
        });
      }
      
      // Create the missing business
      console.log('\n3️⃣ Creating missing business...');
      const { data: newBusiness, error: createError } = await supabase
        .from('businesses')
        .insert({
          id: businessId,
          name: 'My Business',
          owner_id: userId,
          created_by: userId,
          from_number: null,
          verification_status: 'pending',
          surge_account_id: null
        })
        .select()
        .single();
      
      if (createError) {
        console.log('   ❌ Error creating business:', createError.message);
      } else {
        console.log('   ✅ Business created:', newBusiness);
      }
      
    } else {
      console.log('   ✅ Business found:', business);
      
      // Check SMS configuration
      console.log('\n2️⃣ Checking SMS configuration...');
      console.log(`   From number: ${business.from_number || 'Not set'}`);
      console.log(`   Verification status: ${business.verification_status || 'Not set'}`);
      console.log(`   Surge account ID: ${business.surge_account_id || 'Not set'}`);
      
      if (!business.from_number || !business.surge_account_id) {
        console.log('\n3️⃣ SMS not configured. You need to:');
        console.log('   1. Set up a Surge account');
        console.log('   2. Get a phone number from Surge');
        console.log('   3. Update the business record with from_number and surge_account_id');
      }
    }
    
    // Check Surge API
    console.log('\n4️⃣ Checking Surge API...');
    const surgeApiKey = process.env.SURGE_API_KEY;
    const surgeApiBase = process.env.SURGE_API_BASE;
    
    if (!surgeApiKey || !surgeApiBase) {
      console.log('   ❌ Surge API not configured in environment');
      console.log('   Set SURGE_API_KEY and SURGE_API_BASE in your environment');
    } else {
      console.log('   ✅ Surge API configured');
      
      try {
        const surgeResponse = await fetch(`${surgeApiBase}/v1/accounts`, {
          headers: {
            'Authorization': `Bearer ${surgeApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (surgeResponse.ok) {
          const surgeData = await surgeResponse.json();
          console.log('   ✅ Surge API connection successful');
          console.log(`   📊 Found ${surgeData.data?.length || 0} accounts`);
        } else {
          console.log('   ❌ Surge API error:', surgeResponse.status);
        }
      } catch (error) {
        console.log('   ❌ Surge API error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixBusinessSMS();
