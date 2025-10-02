import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTemplates() {
  console.log('🔍 Checking all templates for your business...\n');
  
  try {
    // Check automation_templates
    const { data: automationTemplates, error: autoError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d');
    
    if (autoError) {
      console.error('❌ Error fetching automation templates:', autoError);
    } else {
      console.log('🎯 Automation Templates:');
      if (automationTemplates && automationTemplates.length > 0) {
        automationTemplates.forEach(template => {
          console.log(`  - ID: ${template.id}`);
          console.log(`    Name: "${template.name}"`);
          console.log(`    Key: "${template.key}"`);
          console.log(`    Status: ${template.status}`);
          console.log(`    Custom Message: "${template.custom_message || 'N/A'}"`);
          console.log(`    Config: ${JSON.stringify(template.config_json, null, 2)}`);
          console.log('');
        });
      } else {
        console.log('  No automation templates found');
      }
    }
    
    // Check message_templates (old system)
    const { data: messageTemplates, error: msgError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d');
    
    if (msgError) {
      console.log('ℹ️  No message_templates table or error:', msgError.message);
    } else {
      console.log('📝 Message Templates (old system):');
      if (messageTemplates && messageTemplates.length > 0) {
        messageTemplates.forEach(template => {
          console.log(`  - ID: ${template.id}`);
          console.log(`    Name: "${template.name}"`);
          console.log(`    Content: "${template.content}"`);
          console.log(`    Active: ${template.is_active || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('  No message templates found');
      }
    }
    
    // Check if there are any templates with the default message
    const { data: defaultTemplates, error: defaultError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .or('custom_message.ilike.%Thank you for your payment%')
      .or('config_json->>message.ilike.%Thank you for your payment%');
    
    if (defaultError) {
      console.log('ℹ️  Error searching for default message templates:', defaultError.message);
    } else {
      console.log('🔍 Templates with default payment message:');
      if (defaultTemplates && defaultTemplates.length > 0) {
        defaultTemplates.forEach(template => {
          console.log(`  - ID: ${template.id}`);
          console.log(`    Name: "${template.name}"`);
          console.log(`    Message: "${template.custom_message || template.config_json?.message || 'N/A'}"`);
          console.log('');
        });
      } else {
        console.log('  No templates found with default payment message');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking templates:', error);
  }
}

checkTemplates();
