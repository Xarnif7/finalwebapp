import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCurrentTemplates() {
  console.log('🔍 Checking your current templates...\n');
  
  try {
    // Get all templates for your business
    const { data: templates, error: templateError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .order('created_at', { ascending: false });
    
    if (templateError) {
      console.error('❌ Error fetching templates:', templateError);
      return;
    }
    
    console.log('🎯 Your current templates:');
    if (templates && templates.length > 0) {
      templates.forEach((template, index) => {
        console.log(`  ${index + 1}. ID: ${template.id}`);
        console.log(`     Name: "${template.name}"`);
        console.log(`     Key: "${template.key}"`);
        console.log(`     Status: ${template.status}`);
        console.log(`     Message: "${template.config_json?.message || 'N/A'}"`);
        console.log(`     Created: ${template.created_at}`);
        console.log(`     Updated: ${template.updated_at}`);
        console.log('');
      });
    } else {
      console.log('  No templates found');
    }
    
    // Check if there are any templates with "roofing" or "mowing" in the name
    const roofingTemplates = templates.filter(t => 
      t.name.toLowerCase().includes('roofing') || 
      t.name.toLowerCase().includes('roof')
    );
    
    const mowingTemplates = templates.filter(t => 
      t.name.toLowerCase().includes('mowing') || 
      t.name.toLowerCase().includes('mow') ||
      t.name.toLowerCase().includes('grass') ||
      t.name.toLowerCase().includes('lawn')
    );
    
    console.log('🏠 Roofing templates:');
    if (roofingTemplates.length > 0) {
      roofingTemplates.forEach(template => {
        console.log(`  - "${template.name}" (${template.status})`);
      });
    } else {
      console.log('  No roofing templates found');
    }
    
    console.log('\n🌱 Mowing templates:');
    if (mowingTemplates.length > 0) {
      mowingTemplates.forEach(template => {
        console.log(`  - "${template.name}" (${template.status})`);
      });
    } else {
      console.log('  No mowing templates found');
    }
    
  } catch (error) {
    console.error('❌ Error checking templates:', error);
  }
}

checkCurrentTemplates();
