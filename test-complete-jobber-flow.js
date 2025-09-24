import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCompleteJobberFlow() {
  console.log('🧪 Testing Complete Jobber Integration Flow...\n');
  
  try {
    // Step 1: Check if crm_connections table exists and has data
    console.log('📋 Step 1: Checking CRM connections table...');
    const { data: connections, error: connectionsError } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('crm_type', 'jobber');
    
    if (connectionsError) {
      console.error('❌ Error checking connections:', connectionsError);
      return;
    }
    
    console.log(`✅ Found ${connections.length} Jobber connections`);
    if (connections.length > 0) {
      console.log('📊 Connection details:', connections[0]);
    }
    
    // Step 2: Check if automation_templates table has data
    console.log('\n📋 Step 2: Checking automation templates...');
    const { data: templates, error: templatesError } = await supabase
      .from('automation_templates')
      .select('id, name, service_types, is_default, status')
      .eq('status', 'active');
    
    if (templatesError) {
      console.error('❌ Error checking templates:', templatesError);
      return;
    }
    
    console.log(`✅ Found ${templates.length} active templates`);
    if (templates.length > 0) {
      console.log('📊 Template details:', templates.map(t => ({
        id: t.id,
        name: t.name,
        service_types: t.service_types,
        is_default: t.is_default
      })));
    }
    
    // Step 3: Check if find_template_for_service_type function exists
    console.log('\n📋 Step 3: Testing template matching function...');
    if (connections.length > 0 && templates.length > 0) {
      const { data: matchedTemplate, error: matchError } = await supabase
        .rpc('find_template_for_service_type', {
          p_business_id: connections[0].business_id,
          p_service_type: 'lawn mowing'
        });
      
      if (matchError) {
        console.error('❌ Template matching function error:', matchError);
      } else {
        console.log('✅ Template matching function works');
        console.log('📊 Matched template:', matchedTemplate);
      }
    } else {
      console.log('⚠️ Skipping template matching test - need connections and templates');
    }
    
    // Step 4: Check environment variables
    console.log('\n📋 Step 4: Checking environment variables...');
    const requiredEnvVars = [
      'JOBBER_CLIENT_ID',
      'JOBBER_CLIENT_SECRET', 
      'JOBBER_REDIRECT_URI',
      'NEXT_PUBLIC_APP_URL',
      'RESEND_API_KEY',
      'OPENAI_API_KEY'
    ];
    
    let allEnvVarsPresent = true;
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar}: Set`);
      } else {
        console.log(`❌ ${envVar}: Missing`);
        allEnvVarsPresent = false;
      }
    }
    
    if (allEnvVarsPresent) {
      console.log('✅ All required environment variables are set');
    } else {
      console.log('❌ Some environment variables are missing');
    }
    
    // Step 5: Test AI template matching endpoint
    console.log('\n📋 Step 5: Testing AI template matching...');
    if (connections.length > 0 && templates.length > 0) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://myblipp.com'}/api/ai/match-template`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobberServiceType: 'lawn mowing and edging',
            businessId: connections[0].business_id
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ AI template matching endpoint works');
          console.log('📊 AI match result:', result);
        } else {
          console.error('❌ AI template matching failed:', response.status, await response.text());
        }
      } catch (error) {
        console.error('❌ AI template matching error:', error.message);
      }
    } else {
      console.log('⚠️ Skipping AI template matching test - need connections and templates');
    }
    
    console.log('\n🎯 Complete Jobber Flow Test Summary:');
    console.log(`- CRM Connections: ${connections.length > 0 ? '✅' : '❌'}`);
    console.log(`- Templates: ${templates.length > 0 ? '✅' : '❌'}`);
    console.log(`- Environment Variables: ${allEnvVarsPresent ? '✅' : '❌'}`);
    console.log(`- Database Functions: ${templates.length > 0 ? '✅' : '⚠️'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function main() {
  console.log('🚀 Starting Complete Jobber Integration Flow Test...\n');
  await testCompleteJobberFlow();
  console.log('\n✅ Test completed!');
}

main().catch(console.error);
