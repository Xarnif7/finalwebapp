import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTemplateSchema() {
  console.log('🔍 Checking automation_templates schema...\n');
  
  try {
    // Check current table structure
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'automation_templates' 
          AND column_name = 'key'
          ORDER BY ordinal_position;
        ` 
      });
    
    if (tableError) {
      console.error('❌ Error checking table schema:', tableError);
    } else {
      console.log('📋 Key column info:', tableInfo);
    }
    
    // Check if we can insert with custom key
    console.log('\n🧪 Testing custom key insertion...');
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
      
      // Try to fix the schema issue
      console.log('\n🔧 Attempting to fix schema...');
      
      // Check what the current column type is
      const { data: columnType, error: typeError } = await supabase
        .rpc('exec_sql', { 
          sql: `
            SELECT data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_name = 'automation_templates' 
            AND column_name = 'key';
          ` 
        });
      
      if (typeError) {
        console.error('❌ Error checking column type:', typeError);
      } else {
        console.log('📋 Current key column type:', columnType);
      }
      
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
    console.error('❌ Error checking schema:', error);
  }
}

checkTemplateSchema();
