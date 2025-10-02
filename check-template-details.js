import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTemplateDetails() {
  console.log('🔍 Checking template details...\n');
  
  try {
    // Get the Invoice Paid template
    const { data: template, error: templateError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .eq('key', 'invoice_paid')
      .single();
    
    if (templateError) {
      console.error('❌ Error fetching template:', templateError);
      return;
    }
    
    if (template) {
      console.log('🎯 Invoice Paid template details:');
      console.log(JSON.stringify(template, null, 2));
    } else {
      console.log('❌ Template not found');
    }
    
  } catch (error) {
    console.error('❌ Error checking template details:', error);
  }
}

checkTemplateDetails();
