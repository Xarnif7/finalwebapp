import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateExistingTemplates() {
  console.log('🔧 Updating existing templates for better matching...\n');
  
  try {
    const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
    
    // Update the Job Completed template to be more generic and include keywords
    console.log('🔧 Updating Job Completed template...');
    const { error: jobError } = await supabase
      .from('automation_templates')
      .update({
        name: 'Job Completed',
        status: 'ready', // Change from paused to ready
        config_json: {
          message: 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review.',
          delay_hours: 24,
          keywords: ['roofing', 'roof', 'mowing', 'mow', 'grass', 'lawn', 'cutting', 'yard', 'service', 'work', 'project']
        }
      })
      .eq('business_id', businessId)
      .eq('key', 'job_completed');
    
    if (jobError) {
      console.error('❌ Error updating job completed template:', jobError);
    } else {
      console.log('✅ Job Completed template updated');
    }
    
    // Update the Service Reminder template to be more specific for mowing
    console.log('\n🔧 Updating Service Reminder template...');
    const { error: serviceError } = await supabase
      .from('automation_templates')
      .update({
        name: 'Mowing Service',
        config_json: {
          message: 'Thank you for choosing us for your lawn care! We hope you\'re happy with how your grass looks. Please consider leaving us a review.',
          delay_days: 1,
          delay_hours: 0,
          keywords: ['mowing', 'mow', 'grass', 'lawn', 'cutting', 'yard', 'lawn care']
        }
      })
      .eq('business_id', businessId)
      .eq('key', 'service_reminder');
    
    if (serviceError) {
      console.error('❌ Error updating service reminder template:', serviceError);
    } else {
      console.log('✅ Service Reminder template updated to Mowing Service');
    }
    
    // Update the Invoice Paid template to be more specific for roofing
    console.log('\n🔧 Updating Invoice Paid template...');
    const { error: invoiceError } = await supabase
      .from('automation_templates')
      .update({
        name: 'Roofing Service',
        config_json: {
          message: 'Thank you for choosing us for your roofing project! We hope you\'re satisfied with our work. Please consider leaving us a review.',
          delay_hours: 48,
          keywords: ['roofing', 'roof', 'shingles', 'gutter', 'repair', 'roofing project']
        }
      })
      .eq('business_id', businessId)
      .eq('key', 'invoice_paid');
    
    if (invoiceError) {
      console.error('❌ Error updating invoice paid template:', invoiceError);
    } else {
      console.log('✅ Invoice Paid template updated to Roofing Service');
    }
    
    // Verify templates were updated
    console.log('\n🔍 Verifying updated templates...');
    const { data: allTemplates, error: verifyError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (verifyError) {
      console.error('❌ Error verifying templates:', verifyError);
    } else {
      console.log('📋 Your updated templates:');
      allTemplates.forEach(template => {
        console.log(`  - "${template.name}" (${template.status}) - Key: ${template.key}`);
        console.log(`    Message: "${template.config_json?.message || 'N/A'}"`);
        console.log(`    Keywords: ${JSON.stringify(template.config_json?.keywords || [])}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error updating templates:', error);
  }
}

updateExistingTemplates();
