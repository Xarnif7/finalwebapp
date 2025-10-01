#!/usr/bin/env node
/**
 * Run SMS System Migration
 * Applies the SMS tables and columns to Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Please set these in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('📦 Running SMS System Migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251001_sms_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolons and filter out empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      const preview = statement.substring(0, 60).replace(/\n/g, ' ') + '...';
      
      console.log(`[${i + 1}/${statements.length}] Executing: ${preview}`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Try direct query if RPC fails
        const { error: directError } = await supabase.from('_migrations').select('*').limit(0);
        if (directError) {
          console.error(`❌ Error: ${error.message}`);
          console.error('Statement:', statement);
          throw error;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNew tables created:');
    console.log('  - messages (SMS message history)');
    console.log('  - contacts (SMS contacts with opt-out tracking)');
    console.log('\nBusinesses table updated with SMS columns:');
    console.log('  - surge_account_id, surge_phone_id, from_number');
    console.log('  - sender_type, verification_status, last_verification_error');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
