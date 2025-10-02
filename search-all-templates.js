import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function searchAllTemplates() {
  console.log('🔍 Searching for all templates...\n');
  
  try {
    // Search for templates with various keywords
    const keywords = ['roofing', 'roof', 'mowing', 'mow', 'grass', 'lawn', 'cutting', 'yard'];
    
    for (const keyword of keywords) {
      console.log(`🔍 Searching for "${keyword}"...`);
      
      const { data: templates, error: templateError } = await supabase
        .from('automation_templates')
        .select('*')
        .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
        .or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%`);
      
      if (templateError) {
        console.log(`  ❌ Error: ${templateError.message}`);
      } else if (templates && templates.length > 0) {
        console.log(`  ✅ Found ${templates.length} template(s):`);
        templates.forEach(template => {
          console.log(`    - "${template.name}" (${template.status})`);
        });
      } else {
        console.log(`  No templates found for "${keyword}"`);
      }
      console.log('');
    }
    
    // Check if there are any templates with different business_id
    console.log('🔍 Checking for templates with different business_id...');
    const { data: allTemplates, error: allError } = await supabase
      .from('automation_templates')
      .select('business_id, name, key, status')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (allError) {
      console.error('❌ Error fetching all templates:', allError);
    } else if (allTemplates && allTemplates.length > 0) {
      console.log('📋 Recent templates across all businesses:');
      allTemplates.forEach(template => {
        const isYourBusiness = template.business_id === '674fedc5-7937-4054-bffd-e4ecc22abc1d';
        console.log(`  - "${template.name}" (${template.status}) - Business: ${template.business_id} ${isYourBusiness ? '✅ YOURS' : ''}`);
      });
    }
    
    // Check if there are templates in other tables
    console.log('\n🔍 Checking other template tables...');
    
    // Check message_templates table
    const { data: messageTemplates, error: msgError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .limit(10);
    
    if (msgError) {
      console.log(`  message_templates: ${msgError.message}`);
    } else if (messageTemplates && messageTemplates.length > 0) {
      console.log(`  message_templates: Found ${messageTemplates.length} templates`);
      messageTemplates.forEach(template => {
        console.log(`    - "${template.name}"`);
      });
    } else {
      console.log('  message_templates: No templates found');
    }
    
  } catch (error) {
    console.error('❌ Error searching templates:', error);
  }
}

searchAllTemplates();
