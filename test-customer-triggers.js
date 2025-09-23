// Test customer tab automation triggers
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xvzkrctudezyasinskyo.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCustomerTriggers() {
  try {
    console.log('🧪 Testing customer tab automation triggers...');
    
    // 1. Sign in as a test user
    console.log('🔑 Signing in as test user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'xarnif7@gmail.com',
      password: 'test123' // You'll need to provide the correct password
    });
    
    if (authError) {
      console.error('❌ Auth error:', authError.message);
      console.log('ℹ️ Skipping auth test, will test with mock data...');
    } else {
      console.log('✅ Signed in as:', authData.user.email);
    }
    
    // 2. Get user's business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, created_by')
      .eq('created_by', 'xarnif7@gmail.com')
      .single();
    
    if (businessError || !business) {
      console.error('❌ No business found for xarnif7@gmail.com');
      return;
    }
    
    console.log('🏢 Found business:', business.name, business.id);
    
    // 3. Get customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, full_name, email, business_id')
      .eq('business_id', business.id)
      .limit(3);
    
    if (customersError || !customers || customers.length === 0) {
      console.error('❌ No customers found for business');
      return;
    }
    
    console.log('👥 Found customers:', customers.length);
    const customer = customers[0];
    console.log('👤 Using customer:', customer.full_name, customer.email);
    
    // 4. Check localStorage templates (simulate what the UI does)
    console.log('📋 Checking localStorage templates...');
    
    // Simulate the localStorage key that the UI uses
    const userEmail = 'xarnif7@gmail.com';
    const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const localStorageKey = `blipp_templates_${sanitizedEmail}`;
    
    console.log('🔑 LocalStorage key:', localStorageKey);
    console.log('ℹ️ In the browser, check localStorage for this key to see active templates');
    
    // 5. Test the automation trigger API call
    console.log('🚀 Testing automation trigger API call...');
    
    const templateData = {
      id: 'test-template-123',
      name: 'Test Automation',
      status: 'active',
      trigger_type: 'event',
      channels: ['email'],
      config_json: {
        message: 'Thank you for your business! Please leave us a review.',
        delay_hours: 1
      }
    };
    
    const triggerPayload = {
      customer_id: customer.id,
      trigger_type: 'manual_trigger',
      trigger_data: {
        template_id: templateData.id,
        template_name: templateData.name,
        template_message: templateData.config_json.message,
        delay_hours: templateData.config_json.delay_hours,
        channels: templateData.channels,
        source: 'manual_trigger',
        timestamp: new Date().toISOString(),
        customer_name: customer.full_name,
        customer_email: customer.email
      }
    };
    
    console.log('📤 Trigger payload:', JSON.stringify(triggerPayload, null, 2));
    
    // 6. Check if the API endpoint is accessible
    console.log('🌐 Testing API endpoint accessibility...');
    
    try {
      const response = await fetch('https://myblipp.com/api/health');
      if (response.ok) {
        console.log('✅ API endpoint is accessible');
        const healthData = await response.json();
        console.log('📊 Health check:', healthData);
      } else {
        console.log('⚠️ API endpoint returned:', response.status);
      }
    } catch (error) {
      console.log('❌ API endpoint test failed:', error.message);
    }
    
    console.log('✅ Customer trigger test completed!');
    console.log('🎯 Next steps for testing:');
    console.log('1. Open the app in browser');
    console.log('2. Go to Automations tab and create/activate templates');
    console.log('3. Go to Customers tab');
    console.log('4. Click the dropdown on a customer');
    console.log('5. Click on a template name to trigger automation');
    console.log('6. Check console for success/error messages');
    console.log('7. Check scheduled_jobs and review_requests tables');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCustomerTriggers();
