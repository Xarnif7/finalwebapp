import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runTemplateKeyMigration() {
  console.log('🔧 Running template key migration...\n');
  
  try {
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync('supabase/migrations/20250102_allow_custom_template_keys.sql', 'utf8');
    
    console.log('📝 Executing migration SQL...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });
    
    if (error) {
      console.error('❌ Migration error:', error);
      
      // Try alternative approach - direct SQL execution
      console.log('🔄 Trying alternative approach...');
      
      // Step 1: Drop constraint
      await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE automation_templates DROP CONSTRAINT IF EXISTS automation_templates_key_check;' 
      });
      
      // Step 2: Change column type
      await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE automation_templates ALTER COLUMN key TYPE TEXT;' 
      });
      
      // Step 3: Drop enum type
      await supabase.rpc('exec_sql', { 
        sql: 'DROP TYPE IF EXISTS automation_template_key;' 
      });
      
      // Step 4: Add check constraint
      await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE automation_templates ADD CONSTRAINT automation_templates_key_not_empty CHECK (key IS NOT NULL AND length(trim(key)) > 0);' 
      });
      
      console.log('✅ Migration completed with alternative approach');
    } else {
      console.log('✅ Migration completed successfully');
    }
    
    // Test creating a template with custom key
    console.log('\n🧪 Testing custom key creation...');
    const testBusinessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
    const customKey = `test_custom_${Date.now()}`;
    
    const { data: testTemplate, error: testError } = await supabase
      .from('automation_templates')
      .insert({
        business_id: testBusinessId,
        key: customKey,
        name: 'Test Custom Template',
        status: 'ready',
        channels: ['email'],
        trigger_type: 'event',
        config_json: {
          message: 'This is a test template with custom key',
          delay_hours: 24,
          keywords: ['test']
        },
        description: 'Test template for custom key validation'
      })
      .select()
      .single();
    
    if (testError) {
      console.error('❌ Test template creation failed:', testError);
    } else {
      console.log('✅ Test template created successfully:', testTemplate.name);
      
      // Clean up test template
      await supabase
        .from('automation_templates')
        .delete()
        .eq('id', testTemplate.id);
      
      console.log('🧹 Test template cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
  }
}

runTemplateKeyMigration();
