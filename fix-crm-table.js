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

async function createCrmConnectionsTable() {
  try {
    console.log('🔧 Creating CRM connections table...');
    
    const migrationSQL = `
-- Create CRM connections table to store OAuth tokens and connection status
CREATE TABLE IF NOT EXISTS crm_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  crm_type VARCHAR(50) NOT NULL, -- 'jobber', 'housecall_pro', 'servicetitan', etc.
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'connected', 'error'
  
  -- OAuth tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Webhook configuration
  webhook_id VARCHAR(255),
  webhook_url TEXT,
  webhook_secret TEXT,
  
  -- Connection metadata
  state VARCHAR(255), -- OAuth state parameter for security
  connected_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(business_id, crm_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_connections_business_id ON crm_connections(business_id);
CREATE INDEX IF NOT EXISTS idx_crm_connections_status ON crm_connections(status);
CREATE INDEX IF NOT EXISTS idx_crm_connections_type ON crm_connections(crm_type);

-- Add RLS policies
ALTER TABLE crm_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access connections for their business
CREATE POLICY "Users can access their business CRM connections" ON crm_connections
  FOR ALL USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.created_by = auth.email()
    )
  );

-- Policy: Service role can access all connections (for webhooks)
CREATE POLICY "Service role can access all CRM connections" ON crm_connections
  FOR ALL USING (auth.role() = 'service_role');
`;

    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Error creating table:', error);
      return false;
    }
    
    console.log('✅ CRM connections table created successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Fixing CRM connections table...');
  
  const success = await createCrmConnectionsTable();
  
  if (success) {
    console.log('✅ CRM connections table is now ready!');
    console.log('🔄 Try connecting to Jobber again.');
  } else {
    console.log('❌ Failed to create CRM connections table');
  }
}

main().catch(console.error);
