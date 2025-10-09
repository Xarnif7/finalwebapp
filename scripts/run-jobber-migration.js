/**
 * Run Jobber Integration Migration
 * Creates integrations_jobber table and sets up RLS policies
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🚀 Running Jobber Integration Migration...\n');

  try {
    const sql = readFileSync('supabase/migrations/20251009_jobber_integration_complete.sql', 'utf8');
    
    // Execute the SQL directly using Supabase admin client
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try fallback: execute statements one by one
      console.log('\n⚠️  Trying fallback method...');
      const statements = sql.split(';').filter(s => s.trim().length > 10);
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim() + ';';
        console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
        
        try {
          // Most migrations can be done via direct SQL
          // This requires database access via connection string
          console.log('Statement:', stmt.substring(0, 100) + '...');
        } catch (stmtError) {
          console.error('Statement error:', stmtError.message);
        }
      }
      
      console.log('\n⚠️  Manual migration required!');
      console.log('\n📋 MANUAL STEPS:');
      console.log('   1. Open Supabase Dashboard → SQL Editor');
      console.log('   2. Copy contents of: supabase/migrations/20251009_jobber_integration_complete.sql');
      console.log('   3. Paste and run in SQL Editor');
      console.log('   4. Verify table exists: SELECT * FROM integrations_jobber LIMIT 1;\n');
    } else {
      console.log('✅ Migration completed successfully!\n');
    }
  } catch (error) {
    console.error('❌ Error reading migration file:', error.message);
    console.log('\n📋 MANUAL MIGRATION STEPS:');
    console.log('   1. Open Supabase Dashboard → SQL Editor');
    console.log('   2. Copy contents of: supabase/migrations/20251009_jobber_integration_complete.sql');
    console.log('   3. Paste and run in SQL Editor');
    console.log('   4. Run test again: node scripts/test-jobber-complete.js\n');
  }
}

runMigration();

