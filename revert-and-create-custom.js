import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function revertAndCreateCustom() {
  console.log('🔧 Reverting default templates and creating custom ones...\n');
  
  try {
    const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
    
    // First, revert the default templates back to their original state
    console.log('🔄 Reverting default templates...');
    
    // Revert Invoice Paid template
    const { error: invoiceError } = await supabase
      .from('automation_templates')
      .update({
        name: 'Invoice Paid',
        config_json: {
          message: 'Thank you for your payment! We appreciate your business. Please consider leaving us a review.',
          delay_hours: 48,
          keywords: []
        }
      })
      .eq('business_id', businessId)
      .eq('key', 'invoice_paid');
    
    if (invoiceError) {
      console.error('❌ Error reverting invoice template:', invoiceError);
    } else {
      console.log('✅ Invoice Paid template reverted');
    }
    
    // Revert Service Reminder template
    const { error: serviceError } = await supabase
      .from('automation_templates')
      .update({
        name: 'Service Reminder',
        config_json: {
          message: 'This is a friendly reminder about your upcoming service appointment. We look forward to serving you!',
          delay_days: 1,
          delay_hours: 0,
          keywords: []
        }
      })
      .eq('business_id', businessId)
      .eq('key', 'service_reminder');
    
    if (serviceError) {
      console.error('❌ Error reverting service template:', serviceError);
    } else {
      console.log('✅ Service Reminder template reverted');
    }
    
    // Revert Job Completed template
    const { error: jobError } = await supabase
      .from('automation_templates')
      .update({
        name: 'Job Completed',
        status: 'paused',
        config_json: {
          message: 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review.',
          delay_hours: 24,
          keywords: []
        }
      })
      .eq('business_id', businessId)
      .eq('key', 'job_completed');
    
    if (jobError) {
      console.error('❌ Error reverting job template:', jobError);
    } else {
      console.log('✅ Job Completed template reverted');
    }
    
    // Now create custom templates with unique keys
    console.log('\n🏗️ Creating custom templates...');
    
    // Create Roofing template with a unique key
    const { data: roofingTemplate, error: roofingError } = await supabase
      .from('automation_templates')
      .insert({
        business_id: businessId,
        key: 'invoice_paid', // We'll use the same key but different name
        name: 'Roofing Service',
        status: 'ready',
        channels: ['email', 'sms'],
        trigger_type: 'event',
        config_json: {
          message: 'Thank you for choosing us for your roofing project! We hope you\'re satisfied with our work. Please consider leaving us a review.',
          delay_hours: 48,
          keywords: ['roofing', 'roof', 'shingles', 'gutter', 'repair', 'roofing project'],
          is_custom: true
        },
        description: 'Custom template for roofing services',
        service_types: ['roofing', 'roof repair', 'gutter installation']
      })
      .select()
      .single();
    
    if (roofingError) {
      console.error('❌ Error creating roofing template:', roofingError);
    } else {
      console.log('✅ Roofing Service template created');
    }
    
    // Create Mowing template with a unique key
    const { data: mowingTemplate, error: mowingError } = await supabase
      .from('automation_templates')
      .insert({
        business_id: businessId,
        key: 'service_reminder', // We'll use the same key but different name
        name: 'Mowing Service',
        status: 'ready',
        channels: ['email', 'sms'],
        trigger_type: 'event',
        config_json: {
          message: 'Thank you for choosing us for your lawn care! We hope you\'re happy with how your grass looks. Please consider leaving us a review.',
          delay_days: 1,
          delay_hours: 0,
          keywords: ['mowing', 'mow', 'grass', 'lawn', 'cutting', 'yard', 'lawn care'],
          is_custom: true
        },
        description: 'Custom template for lawn mowing services',
        service_types: ['mowing', 'lawn care', 'grass cutting']
      })
      .select()
      .single();
    
    if (mowingError) {
      console.error('❌ Error creating mowing template:', mowingError);
    } else {
      console.log('✅ Mowing Service template created');
    }
    
    // Verify all templates
    console.log('\n🔍 Verifying all templates...');
    const { data: allTemplates, error: verifyError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (verifyError) {
      console.error('❌ Error verifying templates:', verifyError);
    } else {
      console.log('📋 All your templates:');
      allTemplates.forEach(template => {
        const isCustom = template.config_json?.is_custom ? '🎨 CUSTOM' : '📋 DEFAULT';
        console.log(`  - "${template.name}" (${template.status}) - Key: ${template.key} - ${isCustom}`);
        console.log(`    Message: "${template.config_json?.message || 'N/A'}"`);
        console.log(`    Keywords: ${JSON.stringify(template.config_json?.keywords || [])}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error reverting and creating templates:', error);
  }
}

revertAndCreateCustom();
