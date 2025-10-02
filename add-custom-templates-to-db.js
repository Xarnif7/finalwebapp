import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addCustomTemplatesToDb() {
  console.log('🔧 Adding custom templates to database...\n');
  
  try {
    const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
    
    // Create Roofing template
    console.log('🏠 Creating Roofing template...');
    const { data: roofingTemplate, error: roofingError } = await supabase
      .from('automation_templates')
      .insert({
        business_id: businessId,
        key: 'job_completed', // Use existing valid key
        name: 'roofing',
        status: 'active',
        channels: ['email', 'sms'],
        trigger_type: 'event',
        config_json: {
          message: 'Thank you for choosing us for your roofing project! We hope you\'re satisfied with our work. Please consider leaving us a review.',
          delay_hours: 24,
          keywords: ['roofing', 'roof', 'shingles', 'gutter', 'repair', 'roofing project']
        },
        description: 'Template for roofing services',
        service_types: ['roofing', 'roof repair', 'gutter installation']
      })
      .select()
      .single();
    
    if (roofingError) {
      console.error('❌ Error creating roofing template:', roofingError);
    } else {
      console.log('✅ Roofing template created:', roofingTemplate.name);
    }
    
    // Create Mowing template
    console.log('\n🌱 Creating Mowing template...');
    const { data: mowingTemplate, error: mowingError } = await supabase
      .from('automation_templates')
      .insert({
        business_id: businessId,
        key: 'service_reminder', // Use existing valid key
        name: 'Mowing',
        status: 'active',
        channels: ['email', 'sms'],
        trigger_type: 'event',
        config_json: {
          message: 'Thank you for choosing us for your lawn care! We hope you\'re happy with how your grass looks. Please consider leaving us a review.',
          delay_days: 1,
          delay_hours: 0,
          keywords: ['mowing', 'mow', 'grass', 'lawn', 'cutting', 'yard', 'lawn care']
        },
        description: 'Template for lawn mowing services',
        service_types: ['mowing', 'lawn care', 'grass cutting']
      })
      .select()
      .single();
    
    if (mowingError) {
      console.error('❌ Error creating mowing template:', mowingError);
    } else {
      console.log('✅ Mowing template created:', mowingTemplate.name);
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
        console.log(`  - "${template.name}" (${template.status}) - Key: ${template.key}`);
        console.log(`    ID: ${template.id}`);
        console.log(`    Message: "${template.config_json?.message || 'N/A'}"`);
        console.log(`    Keywords: ${JSON.stringify(template.config_json?.keywords || [])}`);
        console.log('');
      });
    }
    
    console.log('\n🎉 Custom templates added to database!');
    console.log('Now the webhook should be able to find and use your custom templates.');
    
  } catch (error) {
    console.error('❌ Error adding custom templates:', error);
  }
}

addCustomTemplatesToDb();
