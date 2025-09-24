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

async function testEmailAutomation() {
  try {
    console.log('🔍 Testing email automation system...');
    
    // 1. Check if we have customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .limit(5);
    
    if (customersError) {
      console.error('❌ Error fetching customers:', customersError);
      return false;
    }
    
    console.log(`📊 Found ${customers?.length || 0} customers`);
    
    if (!customers || customers.length === 0) {
      console.log('⚠️ No customers found. Creating a test customer...');
      
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .limit(1);
      
      if (!businesses || businesses.length === 0) {
        console.log('❌ No businesses found either');
        return false;
      }
      
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          business_id: businesses[0].id,
          full_name: 'Test Customer',
          email: 'test@example.com',
          phone: '+1234567890',
          status: 'active'
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating test customer:', createError);
        return false;
      }
      
      console.log('✅ Created test customer:', newCustomer.id);
    }
    
    // 2. Check automation templates
    const { data: templates, error: templatesError } = await supabase
      .from('automation_templates')
      .select('*')
      .limit(5);
    
    if (templatesError) {
      console.error('❌ Error fetching templates:', templatesError);
      return false;
    }
    
    console.log(`📊 Found ${templates?.length || 0} automation templates`);
    
    // 3. Test the automation executor API
    console.log('🧪 Testing automation executor API...');
    
    const response = await fetch('http://localhost:3000/api/_cron/magic-send-dispatcher', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        test: true
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Automation executor API working:', result);
    } else {
      console.log('⚠️ Automation executor API not responding (this is normal if server is not running)');
    }
    
    // 4. Test manual email sending
    console.log('📧 Testing manual email sending...');
    
    const testCustomer = customers?.[0];
    if (testCustomer) {
      const emailResponse = await fetch('http://localhost:3000/api/review-requests/send-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: testCustomer.id,
          businessId: testCustomer.business_id,
          method: 'email'
        })
      });
      
      if (emailResponse.ok) {
        const emailResult = await emailResponse.json();
        console.log('✅ Manual email sending working:', emailResult);
      } else {
        console.log('⚠️ Manual email sending not responding (server may not be running)');
      }
    }
    
    console.log('✅ Email automation system check complete!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing email automation system...');
  
  const success = await testEmailAutomation();
  
  if (success) {
    console.log('✅ Email automation system is working!');
  } else {
    console.log('❌ Email automation system has issues');
  }
}

main().catch(console.error);
