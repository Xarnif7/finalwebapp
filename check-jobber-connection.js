import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

console.log('Environment variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Set' : 'Not set');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');

// Use service role key for server-side access
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkJobberConnection() {
  console.log('🔍 Checking Jobber connections in database...');
  
  try {
    // Check if table exists and get all connections
    const { data: connections, error } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('crm_type', 'jobber');
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log('📊 Found connections:', connections?.length || 0);
    
    if (connections && connections.length > 0) {
      connections.forEach((conn, index) => {
        console.log(`\n🔗 Connection ${index + 1}:`);
        console.log(`  Business ID: ${conn.business_id}`);
        console.log(`  CRM Type: ${conn.crm_type}`);
        console.log(`  Connected At: ${conn.connected_at}`);
        console.log(`  Token Expires: ${conn.token_expires_at}`);
        console.log(`  Has Access Token: ${conn.access_token ? 'Yes' : 'No'}`);
        console.log(`  Has Refresh Token: ${conn.refresh_token ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('❌ No Jobber connections found in database');
    }
    
    // Check specific business ID from your logs
    const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
    console.log(`\n🔍 Checking specific business ID: ${businessId}`);
    
    const { data: specificConnection, error: specificError } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('business_id', businessId)
      .eq('crm_type', 'jobber')
      .single();
    
    if (specificError) {
      console.log('❌ Specific connection error:', specificError);
    } else {
      console.log('✅ Specific connection found:', specificConnection);
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkJobberConnection();
