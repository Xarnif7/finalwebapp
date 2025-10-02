import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateTemplatesWithCustomNames() {
  console.log('🔧 Updating existing templates with custom names and keywords...\n');
  
  try {
    const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
    
    // Update Invoice Paid template to be "roofing"
    console.log('🏠 Updating Invoice Paid template to "roofing"...');
    const { error: roofingError } = await supabase
      .from('automation_templates')
      .update({
        name: 'roofing',
        status: 'active',
        config_json: {
          message: 'Thank you for choosing us for your roofing project! We hope you\'re satisfied with our work. Please consider leaving us a review.',
          delay_hours: 48,
          keywords: ['roofing', 'roof', 'shingles', 'gutter', 'repair', 'roofing project']
        }
      })
      .eq('business_id', businessId)
      .eq('key', 'invoice_paid');
    
    if (roofingError) {
      console.error('❌ Error updating roofing template:', roofingError);
    } else {
      console.log('✅ Invoice Paid template updated to "roofing"');
    }
    
    // Update Service Reminder template to be "Mowing"
    console.log('\n🌱 Updating Service Reminder template to "Mowing"...');
    const { error: mowingError } = await supabase
      .from('automation_templates')
      .update({
        name: 'Mowing',
        status: 'active',
        config_json: {
          message: 'Thank you for choosing us for your lawn care! We hope you\'re happy with how your grass looks. Please consider leaving us a review.',
          delay_days: 1,
          delay_hours: 0,
          keywords: ['mowing', 'mow', 'grass', 'lawn', 'cutting', 'yard', 'lawn care']
        }
      })
      .eq('business_id', businessId)
      .eq('key', 'service_reminder');
    
    if (mowingError) {
      console.error('❌ Error updating mowing template:', mowingError);
    } else {
      console.log('✅ Service Reminder template updated to "Mowing"');
    }
    
    // Update Job Completed template to be a general fallback
    console.log('\n🔧 Updating Job Completed template...');
    const { error: jobError } = await supabase
      .from('automation_templates')
      .update({
        name: 'Job Completed',
        status: 'active',
        config_json: {
          message: 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review.',
          delay_hours: 24,
          keywords: ['roofing', 'roof', 'mowing', 'mow', 'grass', 'lawn', 'cutting', 'yard', 'service', 'work', 'project', 'completed']
        }
      })
      .eq('business_id', businessId)
      .eq('key', 'job_completed');
    
    if (jobError) {
      console.error('❌ Error updating job template:', jobError);
    } else {
      console.log('✅ Job Completed template updated');
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
        console.log(`    ID: ${template.id}`);
        console.log(`    Message: "${template.config_json?.message || 'N/A'}"`);
        console.log(`    Keywords: ${JSON.stringify(template.config_json?.keywords || [])}`);
        console.log('');
      });
    }
    
    console.log('\n🎉 Templates updated successfully!');
    console.log('Now when you send an invoice with "roofing" or "mowing" in the description,');
    console.log('the webhook should select the correct template.');
    
  } catch (error) {
    console.error('❌ Error updating templates:', error);
  }
}

updateTemplatesWithCustomNames();
