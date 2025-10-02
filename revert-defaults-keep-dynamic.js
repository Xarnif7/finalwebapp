import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function revertDefaultsKeepDynamic() {
  console.log('🔧 Reverting default templates to original state...\n');
  
  try {
    const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
    
    // Revert Invoice Paid template to original default
    console.log('🔄 Reverting Invoice Paid template...');
    const { error: invoiceError } = await supabase
      .from('automation_templates')
      .update({
        name: 'Invoice Paid',
        config_json: {
          message: 'Thank you for your payment! We appreciate your business. Please consider leaving us a review.',
          delay_hours: 48,
          keywords: [] // Remove custom keywords, keep it as default
        }
      })
      .eq('business_id', businessId)
      .eq('key', 'invoice_paid');
    
    if (invoiceError) {
      console.error('❌ Error reverting invoice template:', invoiceError);
    } else {
      console.log('✅ Invoice Paid template reverted to default');
    }
    
    // Revert Service Reminder template to original default
    console.log('🔄 Reverting Service Reminder template...');
    const { error: serviceError } = await supabase
      .from('automation_templates')
      .update({
        name: 'Service Reminder',
        config_json: {
          message: 'This is a friendly reminder about your upcoming service appointment. We look forward to serving you!',
          delay_days: 1,
          delay_hours: 0,
          keywords: [] // Remove custom keywords, keep it as default
        }
      })
      .eq('business_id', businessId)
      .eq('key', 'service_reminder');
    
    if (serviceError) {
      console.error('❌ Error reverting service template:', serviceError);
    } else {
      console.log('✅ Service Reminder template reverted to default');
    }
    
    // Revert Job Completed template to original default
    console.log('🔄 Reverting Job Completed template...');
    const { error: jobError } = await supabase
      .from('automation_templates')
      .update({
        name: 'Job Completed',
        status: 'paused', // Back to paused as default
        config_json: {
          message: 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review.',
          delay_hours: 24,
          keywords: [] // Remove custom keywords, keep it as default
        }
      })
      .eq('business_id', businessId)
      .eq('key', 'job_completed');
    
    if (jobError) {
      console.error('❌ Error reverting job template:', jobError);
    } else {
      console.log('✅ Job Completed template reverted to default');
    }
    
    // Verify all templates are back to defaults
    console.log('\n🔍 Verifying default templates...');
    const { data: allTemplates, error: verifyError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (verifyError) {
      console.error('❌ Error verifying templates:', verifyError);
    } else {
      console.log('📋 Your templates (now back to defaults):');
      allTemplates.forEach(template => {
        console.log(`  - "${template.name}" (${template.status}) - Key: ${template.key}`);
        console.log(`    Message: "${template.config_json?.message || 'N/A'}"`);
        console.log(`    Keywords: ${JSON.stringify(template.config_json?.keywords || [])}`);
        console.log('');
      });
    }
    
    console.log('\n💡 How it works now:');
    console.log('✅ Default templates are back to original state for new users');
    console.log('✅ You can still customize them in your dashboard');
    console.log('✅ Webhook will dynamically use whatever you set');
    console.log('✅ New users get clean defaults, existing users can customize');
    
  } catch (error) {
    console.error('❌ Error reverting defaults:', error);
  }
}

revertDefaultsKeepDynamic();
