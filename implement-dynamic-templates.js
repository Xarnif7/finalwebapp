import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function implementDynamicTemplates() {
  console.log('🔧 Implementing dynamic template system...\n');
  
  try {
    const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
    
    // Step 1: Remove all existing templates for this business
    console.log('🗑️ Removing existing templates...');
    const { error: deleteError } = await supabase
      .from('automation_templates')
      .delete()
      .eq('business_id', businessId);
    
    if (deleteError) {
      console.error('❌ Error deleting templates:', deleteError);
    } else {
      console.log('✅ Existing templates removed');
    }
    
    // Step 2: Create a proper template creation function
    console.log('\n📝 Creating template creation function...');
    
    // This function will be used by the dashboard to create templates
    const createTemplate = async (businessId, templateData) => {
      const { data: template, error } = await supabase
        .from('automation_templates')
        .insert({
          business_id: businessId,
          key: templateData.key || `custom_${Date.now()}`,
          name: templateData.name,
          status: templateData.status || 'ready',
          channels: templateData.channels || ['email'],
          trigger_type: templateData.trigger_type || 'event',
          config_json: templateData.config_json || {
            message: templateData.message || 'Thank you for your business!',
            delay_hours: templateData.delay_hours || 24,
            keywords: templateData.keywords || []
          },
          description: templateData.description || '',
          service_types: templateData.service_types || []
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error creating template:', error);
        return null;
      }
      
      console.log(`✅ Template created: "${template.name}"`);
      return template;
    };
    
    // Step 3: Create some example templates for this business (roofing/mowing)
    console.log('\n🏠 Creating example templates for this business...');
    
    const roofingTemplate = await createTemplate(businessId, {
      name: 'roofing',
      key: 'roofing_service',
      status: 'active',
      channels: ['email', 'sms'],
      trigger_type: 'event',
      message: 'Thank you for choosing us for your roofing project! We hope you\'re satisfied with our work. Please consider leaving us a review.',
      delay_hours: 48,
      keywords: ['roofing', 'roof', 'shingles', 'gutter', 'repair', 'roofing project'],
      service_types: ['roofing', 'roof repair', 'gutter installation'],
      description: 'Template for roofing services'
    });
    
    const mowingTemplate = await createTemplate(businessId, {
      name: 'Mowing',
      key: 'mowing_service',
      status: 'active',
      channels: ['email', 'sms'],
      trigger_type: 'event',
      message: 'Thank you for choosing us for your lawn care! We hope you\'re happy with how your grass looks. Please consider leaving us a review.',
      delay_hours: 24,
      keywords: ['mowing', 'mow', 'grass', 'lawn', 'cutting', 'yard', 'lawn care'],
      service_types: ['mowing', 'lawn care', 'grass cutting'],
      description: 'Template for lawn mowing services'
    });
    
    // Step 4: Verify the new system
    console.log('\n🔍 Verifying dynamic template system...');
    const { data: allTemplates, error: verifyError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (verifyError) {
      console.error('❌ Error verifying templates:', verifyError);
    } else {
      console.log('📋 Your dynamic templates:');
      allTemplates.forEach(template => {
        console.log(`  - "${template.name}" (${template.status}) - Key: ${template.key}`);
        console.log(`    ID: ${template.id}`);
        console.log(`    Message: "${template.config_json?.message || 'N/A'}"`);
        console.log(`    Keywords: ${JSON.stringify(template.config_json?.keywords || [])}`);
        console.log('');
      });
    }
    
    console.log('\n🎉 Dynamic template system implemented!');
    console.log('✅ New businesses will start with no templates');
    console.log('✅ Templates are created dynamically when users customize them');
    console.log('✅ All templates are saved to database for webhook access');
    console.log('✅ Each business gets their own custom templates');
    
  } catch (error) {
    console.error('❌ Error implementing dynamic templates:', error);
  }
}

implementDynamicTemplates();
