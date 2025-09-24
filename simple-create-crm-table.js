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

async function createTable() {
  try {
    console.log('🔧 Creating crm_connections table...');
    
    // Simple CREATE TABLE statement
    const createTableSQL = `
CREATE TABLE IF NOT EXISTS crm_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  crm_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  webhook_id VARCHAR(255),
  webhook_url TEXT,
  webhook_secret TEXT,
  state VARCHAR(255),
  connected_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, crm_type)
);
`;

    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      console.error('❌ Error creating table:', error);
      return false;
    }
    
    console.log('✅ Table created!');
    
    // Add RLS
    const rlsSQL = `ALTER TABLE crm_connections ENABLE ROW LEVEL SECURITY;`;
    await supabase.rpc('exec_sql', { sql: rlsSQL });
    
    // Add policy
    const policySQL = `
CREATE POLICY "Users can access their business CRM connections" ON crm_connections
  FOR ALL USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.created_by = auth.email()
    )
  );
`;
    await supabase.rpc('exec_sql', { sql: policySQL });
    
    // Verify the table was created
    const { data, error: verifyError } = await supabase
      .from('crm_connections')
      .select('*')
      .limit(1);
    
    if (verifyError) {
      console.error('❌ Table verification failed:', verifyError);
      return false;
    }
    
    console.log('✅ CRM connections table created and verified!');
    return true;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Creating CRM connections table...');
  
  const success = await createTable();
  
  if (success) {
    console.log('✅ CRM connections table is now ready!');
    console.log('🔄 Try connecting to Jobber again.');
  } else {
    console.log('❌ Failed to create CRM connections table');
  }
}

main().catch(console.error);
