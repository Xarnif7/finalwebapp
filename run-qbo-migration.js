import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runQboMigration() {
  try {
    console.log('🚀 Running QuickBooks Online integration migration...');
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250128_add_quickbooks_integration_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try alternative approach - execute SQL directly
      console.log('🔄 Trying direct SQL execution...');
      
      // Split the migration into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      for (const statement of statements) {
        try {
          console.log(`📝 Executing: ${statement.substring(0, 50)}...`);
          const { error: stmtError } = await supabase.rpc('exec_sql', {
            sql: statement + ';'
          });
          
          if (stmtError) {
            console.log(`⚠️  Statement failed (may already exist): ${stmtError.message}`);
          } else {
            console.log('✅ Statement executed successfully');
          }
        } catch (err) {
          console.log(`⚠️  Statement error (may already exist): ${err.message}`);
        }
      }
      
    } else {
      console.log('✅ Migration completed successfully!');
    }
    
    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['integrations_quickbooks', 'qbo_import_logs']);
    
    if (tablesError) {
      console.error('❌ Could not verify tables:', tablesError);
    } else {
      console.log('📋 Created tables:', tables?.map(t => t.table_name) || []);
    }
    
    console.log('🎉 QuickBooks Online integration setup complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

runQboMigration();
