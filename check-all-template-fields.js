import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllTemplateFields() {
  console.log('🔍 Checking all template fields...\n');
  
  try {
    // Get all templates to see what fields are available
    const { data: templates, error: templateError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .limit(1);
    
    if (templateError) {
      console.error('❌ Error fetching templates:', templateError);
      return;
    }
    
    if (templates && templates.length > 0) {
      const template = templates[0];
      console.log('🎯 Template fields available:');
      Object.keys(template).forEach(key => {
        console.log(`  - ${key}: ${JSON.stringify(template[key])}`);
      });
    } else {
      console.log('❌ No templates found');
    }
    
  } catch (error) {
    console.error('❌ Error checking template fields:', error);
  }
}

checkAllTemplateFields();
