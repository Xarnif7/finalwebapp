import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

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
    
    // Read the migration file
    const migrationPath = './supabase/migrations/20250123_create_crm_connections.sql';
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`  ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Some errors are expected (like table already exists)
        if (!error.message.includes('already exists') && !error.message.includes('duplicate key')) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
        } else {
          console.log(`  ✅ Statement ${i + 1} completed (expected warning)`);
        }
      } else {
        console.log(`  ✅ Statement ${i + 1} completed`);
      }
    }
    
    // Verify the table was created
    const { data, error } = await supabase
      .from('crm_connections')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Table verification failed:', error);
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
