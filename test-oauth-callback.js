import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCallback() {
  console.log('🧪 Testing OAuth callback simulation...');
  
  // Simulate the callback with a fake authorization code
  const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
  
  console.log('📋 Business ID:', businessId);
  console.log('🔑 Client ID:', process.env.JOBBER_CLIENT_ID);
  console.log('🔐 Client Secret:', process.env.JOBBER_CLIENT_SECRET ? 'Set' : 'Not set');
  console.log('🔗 Redirect URI:', process.env.JOBBER_REDIRECT_URI);
  
  // Test database connection
  console.log('\n🔍 Testing database connection...');
  try {
    const { data, error } = await supabase
      .from('crm_connections')
      .select('count')
      .eq('crm_type', 'jobber');
    
    if (error) {
      console.error('❌ Database error:', error);
    } else {
      console.log('✅ Database connection successful');
    }
  } catch (err) {
    console.error('❌ Database connection failed:', err);
  }
  
  // Test if we can insert a connection
  console.log('\n🧪 Testing connection insertion...');
  try {
    const { error: insertError } = await supabase
      .from('crm_connections')
      .upsert({
        business_id: businessId,
        crm_type: 'jobber',
        access_token: 'test_token',
        refresh_token: 'test_refresh',
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
        connected_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('❌ Insert error:', insertError);
    } else {
      console.log('✅ Insert successful');
      
      // Clean up test data
      await supabase
        .from('crm_connections')
        .delete()
        .eq('business_id', businessId)
        .eq('crm_type', 'jobber');
      console.log('🧹 Test data cleaned up');
    }
  } catch (err) {
    console.error('❌ Insert failed:', err);
  }
}

testCallback();
