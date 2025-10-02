import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createCustomTemplatesProper() {
  console.log('🔧 Creating custom templates properly...\n');
  
  try {
    const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
    
    // First, let's see what templates we currently have
    console.log('🔍 Current templates:');
    const { data: currentTemplates, error: currentError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (currentError) {
      console.error('❌ Error fetching current templates:', currentError);
      return;
    }
    
    currentTemplates.forEach(template => {
      console.log(`  - "${template.name}" (${template.status}) - Key: ${template.key}`);
    });
    
    // The issue is that we can't have multiple templates with the same key
    // So let's update the existing templates to be more flexible
    console.log('\n🔧 Updating existing templates to be more flexible...');
    
    // Update Invoice Paid to be a general template that can match roofing
    const { error: invoiceError } = await supabase
      .from('automation_templates')
      .update({
        name: 'Invoice Paid',
        config_json: {
          message: 'Thank you for your payment! We appreciate your business. Please consider leaving us a review.',
          delay_hours: 48,
          keywords: ['roofing', 'roof', 'shingles', 'gutter', 'repair', 'roofing project', 'payment', 'invoice'],
          is_custom: false
        }
      })
      .eq('business_id', businessId)
      .eq('key', 'invoice_paid');
    
    if (invoiceError) {
      console.error('❌ Error updating invoice template:', invoiceError);
    } else {
      console.log('✅ Invoice Paid template updated with roofing keywords');
    }
    
    // Update Service Reminder to be a general template that can match mowing
    const { error: serviceError } = await supabase
      .from('automation_templates')
      .update({
        name: 'Service Reminder',
        config_json: {
          message: 'This is a friendly reminder about your upcoming service appointment. We look forward to serving you!',
          delay_days: 1,
          delay_hours: 0,
          keywords: ['mowing', 'mow', 'grass', 'lawn', 'cutting', 'yard', 'lawn care', 'service', 'appointment'],
          is_custom: false
        }
      })
      .eq('business_id', businessId)
      .eq('key', 'service_reminder');
    
    if (serviceError) {
      console.error('❌ Error updating service template:', serviceError);
    } else {
      console.log('✅ Service Reminder template updated with mowing keywords');
    }
    
    // Update Job Completed to be a general fallback template
    const { error: jobError } = await supabase
      .from('automation_templates')
      .update({
        name: 'Job Completed',
        status: 'ready',
        config_json: {
          message: 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review.',
          delay_hours: 24,
          keywords: ['roofing', 'roof', 'mowing', 'mow', 'grass', 'lawn', 'cutting', 'yard', 'service', 'work', 'project', 'completed'],
          is_custom: false
        }
      })
      .eq('business_id', businessId)
      .eq('key', 'job_completed');
    
    if (jobError) {
      console.error('❌ Error updating job template:', jobError);
    } else {
      console.log('✅ Job Completed template updated with general keywords');
    }
    
    // Verify all templates
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
    
    console.log('\n💡 Now you can:');
    console.log('1. Go to your Blipp dashboard');
    console.log('2. Edit these templates to change their names and messages');
    console.log('3. The webhook will use whatever you set in the template names and keywords');
    console.log('4. For example, change "Invoice Paid" to "Roofing Service" if you want');
    
  } catch (error) {
    console.error('❌ Error creating custom templates:', error);
  }
}

createCustomTemplatesProper();
