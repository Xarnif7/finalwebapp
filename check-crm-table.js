import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTable() {
  try {
    console.log('🔍 Checking if crm_connections table exists...');
    
    // Try to query the table
    const { data, error } = await supabase
      .from('crm_connections')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ Table crm_connections does not exist');
        console.log('🔧 Need to create the table');
        return false;
      } else {
        console.error('❌ Error checking table:', error);
        return false;
      }
    }
    
    console.log('✅ Table crm_connections exists!');
    console.log('📊 Current records:', data?.length || 0);
    return true;
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    return false;
  }
}

async function main() {
  const exists = await checkTable();
  
  if (!exists) {
    console.log('🚨 The crm_connections table needs to be created!');
    console.log('💡 You need to run the migration: supabase/migrations/20250123_create_crm_connections.sql');
  }
}

main().catch(console.error);
