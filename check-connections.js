import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkConnections() {
  console.log('🔍 Checking all Jobber connections...');
  
  const { data: connections, error } = await supabase
    .from('crm_connections')
    .select('*')
    .eq('crm_type', 'jobber');
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('📊 Found connections:', connections?.length || 0);
  
  if (connections && connections.length > 0) {
    connections.forEach((conn, index) => {
      console.log(`\n🔗 Connection ${index + 1}:`);
      console.log(`  Business ID: ${conn.business_id}`);
      console.log(`  Connected At: ${conn.connected_at}`);
      console.log(`  Has Access Token: ${conn.access_token ? 'Yes' : 'No'}`);
    });
  }
  
  // Check specific business ID from the logs
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
}

checkConnections();
