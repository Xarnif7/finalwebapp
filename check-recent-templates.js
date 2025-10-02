import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRecentTemplates() {
  console.log('🔍 Checking recent templates...\n');
  
  try {
    // Get all templates ordered by updated_at
    const { data: templates, error: templateError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .order('updated_at', { ascending: false });
    
    if (templateError) {
      console.error('❌ Error fetching templates:', templateError);
      return;
    }
    
    console.log('🎯 All templates (ordered by most recent update):');
    if (templates && templates.length > 0) {
      templates.forEach((template, index) => {
        const isToday = new Date(template.updated_at).toDateString() === new Date().toDateString();
        console.log(`  ${index + 1}. ID: ${template.id}`);
        console.log(`     Name: "${template.name}"`);
        console.log(`     Key: "${template.key}"`);
        console.log(`     Status: ${template.status}`);
        console.log(`     Custom Message: "${template.custom_message || 'N/A'}"`);
        console.log(`     Config Message: "${template.config_json?.message || 'N/A'}"`);
        console.log(`     Updated: ${template.updated_at} ${isToday ? '🆕 TODAY' : ''}`);
        console.log('');
      });
    } else {
      console.log('  No templates found');
    }
    
    // Check if there are any templates with custom_message set
    const { data: customTemplates, error: customError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .not('custom_message', 'is', null);
    
    if (customError) {
      console.error('❌ Error fetching custom templates:', customError);
      return;
    }
    
    console.log('🎯 Templates with custom_message set:');
    if (customTemplates && customTemplates.length > 0) {
      customTemplates.forEach(template => {
        console.log(`  - ID: ${template.id}`);
        console.log(`    Name: "${template.name}"`);
        console.log(`    Custom Message: "${template.custom_message}"`);
        console.log('');
      });
    } else {
      console.log('  No templates with custom_message found');
    }
    
  } catch (error) {
    console.error('❌ Error checking recent templates:', error);
  }
}

checkRecentTemplates();
