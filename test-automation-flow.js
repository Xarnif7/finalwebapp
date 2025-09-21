import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Test the automation flow: Connect CRM → Templates auto-created → Enable templates
async function testAutomationFlow() {
  console.log('🧪 Testing Automation Flow: Google Sheets Connection → Auto Template Creation');
  console.log('=' .repeat(80));

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Step 1: Get the test business
    console.log('\n📋 Step 1: Getting test business...');
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('created_by', '3671eeff-f8db-4cae-b545-7512ad1af66c')
      .single();

    if (businessError) {
      console.error('❌ Error getting business:', businessError);
      return;
    }

    console.log('✅ Business found:', business.name);

    // Step 2: Check if templates already exist
    console.log('\n📋 Step 2: Checking existing templates...');
    const { data: existingTemplates, error: templatesError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', business.id);

    if (templatesError) {
      console.error('❌ Error checking templates:', templatesError);
      return;
    }

    console.log(`📊 Found ${existingTemplates.length} existing templates`);

    // Step 3: Simulate adding a customer (like Google Sheets would do)
    console.log('\n📋 Step 3: Simulating customer import from Google Sheets...');
    
    const testCustomer = {
      business_id: business.id,
      created_by: '3671eeff-f8db-4cae-b545-7512ad1af66c',
      full_name: 'Test Customer from Google Sheets',
      email: 'test@example.com',
      phone: '+1234567890',
      service_date: new Date().toISOString(),
      source: 'google_sheets',
      created_at: new Date().toISOString()
    };

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert(testCustomer)
      .select()
      .single();

    if (customerError) {
      console.error('❌ Error creating test customer:', customerError);
      return;
    }

    console.log('✅ Test customer created:', customer.full_name);

    // Step 4: Check if templates were auto-created
    console.log('\n📋 Step 4: Checking if templates were auto-created...');
    
    const { data: updatedTemplates, error: updatedTemplatesError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', business.id);

    if (updatedTemplatesError) {
      console.error('❌ Error checking updated templates:', updatedTemplatesError);
      return;
    }

    console.log(`📊 Now have ${updatedTemplates.length} templates`);

    if (updatedTemplates.length > existingTemplates.length) {
      console.log('🎉 SUCCESS: Templates were automatically created!');
      updatedTemplates.forEach(template => {
        console.log(`  - ${template.name} (${template.key}) - Status: ${template.status}`);
      });
    } else {
      console.log('⚠️  No new templates were created. This might be expected if they already existed.');
    }

    // Step 5: Test enabling a template
    console.log('\n📋 Step 5: Testing template enable functionality...');
    
    if (updatedTemplates.length > 0) {
      const templateToEnable = updatedTemplates.find(t => t.status === 'ready');
      
      if (templateToEnable) {
        console.log(`🔧 Enabling template: ${templateToEnable.name}`);
        
        const { error: enableError } = await supabase
          .from('automation_templates')
          .update({ status: 'active' })
          .eq('id', templateToEnable.id);

        if (enableError) {
          console.error('❌ Error enabling template:', enableError);
        } else {
          console.log('✅ Template enabled successfully!');
        }
      } else {
        console.log('ℹ️  No ready templates to enable (all may already be active)');
      }
    }

    // Step 6: Check business integration status
    console.log('\n📋 Step 6: Checking business integration status...');
    
    const { data: integration, error: integrationError } = await supabase
      .from('business_integrations')
      .select('*')
      .eq('business_id', business.id)
      .eq('provider', 'zapier')
      .single();

    if (integrationError && integrationError.code !== 'PGRST116') {
      console.error('❌ Error checking integration:', integrationError);
    } else if (integration) {
      console.log('✅ Business integration found:', integration.status);
    } else {
      console.log('ℹ️  No Zapier integration found (this is expected for manual testing)');
    }

    // Step 7: Test the API endpoint directly
    console.log('\n📋 Step 7: Testing API endpoint for template provisioning...');
    
    try {
      const response = await fetch('http://localhost:3001/api/templates/provision-defaults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          business_id: business.id
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ API endpoint working:', result);
      } else {
        console.log('⚠️  API endpoint response:', result);
      }
    } catch (apiError) {
      console.log('⚠️  API endpoint test failed (server might not be running):', apiError.message);
    }

    console.log('\n🎯 Test Summary:');
    console.log(`  - Business: ${business.name}`);
    console.log(`  - Customer created: ${customer.full_name}`);
    console.log(`  - Templates available: ${updatedTemplates.length}`);
    console.log(`  - Ready templates: ${updatedTemplates.filter(t => t.status === 'ready').length}`);
    console.log(`  - Active templates: ${updatedTemplates.filter(t => t.status === 'active').length}`);

    console.log('\n✅ Automation flow test completed!');
    console.log('\n📝 Next steps:');
    console.log('  1. Go to the Automations tab in your app');
    console.log('  2. Check the Templates tab - you should see 3 templates');
    console.log('  3. Try enabling a template by clicking "Enable Template"');
    console.log('  4. Check the Active Sequences tab to see if it appears there');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAutomationFlow();
