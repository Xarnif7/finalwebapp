import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createCustomTemplates() {
  console.log('🔧 Creating custom templates for roofing and mowing...\n');
  
  try {
    const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
    
    // Create Roofing template
    console.log('🏠 Creating Roofing template...');
    const { data: roofingTemplate, error: roofingError } = await supabase
      .from('automation_templates')
      .insert({
        business_id: businessId,
        key: 'roofing',
        name: 'Roofing',
        status: 'ready',
        channels: ['email', 'sms'],
        trigger_type: 'event',
        config_json: {
          message: 'Thank you for choosing us for your roofing project! We hope you\'re satisfied with our work. Please consider leaving us a review.',
          delay_hours: 24,
          keywords: ['roofing', 'roof', 'shingles', 'gutter', 'repair']
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
        key: 'mowing',
        name: 'Mowing',
        status: 'ready',
        channels: ['email', 'sms'],
        trigger_type: 'event',
        config_json: {
          message: 'Thank you for choosing us for your lawn care! We hope you\'re happy with how your grass looks. Please consider leaving us a review.',
          delay_hours: 24,
          keywords: ['mowing', 'mow', 'grass', 'lawn', 'cutting', 'yard']
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
    
    // Verify templates were created
    console.log('\n🔍 Verifying templates...');
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
      });
    }
    
  } catch (error) {
    console.error('❌ Error creating custom templates:', error);
  }
}

createCustomTemplates();
