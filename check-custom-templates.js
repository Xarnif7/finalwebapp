import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCustomTemplates() {
  console.log('🔍 Checking your custom templates...\n');
  
  try {
    const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
    
    // Check all templates in automation_templates table
    console.log('📋 All automation_templates:');
    const { data: automationTemplates, error: autoError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (autoError) {
      console.error('❌ Error fetching automation templates:', autoError);
    } else if (automationTemplates && automationTemplates.length > 0) {
      automationTemplates.forEach(template => {
        console.log(`  - "${template.name}" (${template.status}) - Key: ${template.key}`);
        console.log(`    ID: ${template.id}`);
        console.log(`    Message: "${template.config_json?.message || 'N/A'}"`);
        console.log(`    Keywords: ${JSON.stringify(template.config_json?.keywords || [])}`);
        console.log('');
      });
    } else {
      console.log('  No automation templates found');
    }
    
    // Check if there are templates in other tables
    console.log('🔍 Checking other template tables...');
    
    // Check message_templates table
    const { data: messageTemplates, error: msgError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('business_id', businessId);
    
    if (msgError) {
      console.log(`  message_templates: ${msgError.message}`);
    } else if (messageTemplates && messageTemplates.length > 0) {
      console.log('📝 Message templates:');
      messageTemplates.forEach(template => {
        console.log(`  - "${template.name}" - Content: "${template.content}"`);
      });
    } else {
      console.log('  No message templates found');
    }
    
    // Check if there are templates with "roofing" or "mowing" in the name
    console.log('\n🔍 Searching for roofing/mowing templates...');
    const { data: customTemplates, error: customError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', businessId)
      .or('name.ilike.%roofing%,name.ilike.%mowing%,name.ilike.%roof%,name.ilike.%mow%');
    
    if (customError) {
      console.error('❌ Error searching for custom templates:', customError);
    } else if (customTemplates && customTemplates.length > 0) {
      console.log('🎯 Found custom templates:');
      customTemplates.forEach(template => {
        console.log(`  - "${template.name}" (${template.status}) - Key: ${template.key}`);
        console.log(`    ID: ${template.id}`);
        console.log(`    Message: "${template.config_json?.message || 'N/A'}"`);
        console.log('');
      });
    } else {
      console.log('  No custom roofing/mowing templates found');
    }
    
  } catch (error) {
    console.error('❌ Error checking custom templates:', error);
  }
}

checkCustomTemplates();
