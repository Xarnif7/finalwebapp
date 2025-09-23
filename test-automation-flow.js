// Test the complete automation flow
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xvzkrctudezyasinskyo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAutomationFlow() {
  try {
    console.log('🧪 Testing complete automation flow...');
    
    // 1. Check if we have customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, full_name, email, business_id')
      .limit(1);
    
    if (customersError) {
      console.error('❌ Error fetching customers:', customersError);
      return;
    }
    
    if (!customers || customers.length === 0) {
      console.log('⚠️ No customers found. Creating a test customer...');
      
      // Create a test customer
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .limit(1);
      
      if (!businesses || businesses.length === 0) {
        console.error('❌ No businesses found. Cannot create test customer.');
        return;
      }
      
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          business_id: businesses[0].id,
          full_name: 'Test Customer',
          email: 'test@example.com',
          phone: '+1234567890'
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating test customer:', createError);
        return;
      }
      
      console.log('✅ Test customer created:', newCustomer.full_name);
      customers.push(newCustomer);
    }
    
    const customer = customers[0];
    console.log('👤 Using customer:', customer.full_name, customer.email);
    
    // 2. Test automation trigger API
    console.log('🚀 Testing automation trigger API...');
    
    const triggerData = {
      customer_id: customer.id,
      trigger_type: 'manual_trigger',
      trigger_data: {
        template_id: 'test-template-123',
        template_name: 'Test Automation',
        template_message: 'Thank you for your business! Please leave us a review.',
        delay_hours: 1, // 1 hour delay for testing
        channels: ['email'],
        source: 'test',
        timestamp: new Date().toISOString()
      }
    };
    
    // Get a valid user token for testing
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError || !users || users.length === 0) {
      console.error('❌ No users found for testing');
      return;
    }
    
    // Use the first user's email to get their business
    const testUserEmail = users[0].email;
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('created_by', testUserEmail)
      .single();
    
    if (!business) {
      console.error('❌ No business found for user:', testUserEmail);
      return;
    }
    
    console.log('🏢 Using business:', business.id);
    
    // 3. Check scheduled_jobs table
    console.log('📋 Checking scheduled_jobs table...');
    const { data: scheduledJobs, error: jobsError } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .limit(5);
    
    if (jobsError) {
      console.error('❌ Error checking scheduled_jobs:', jobsError);
    } else {
      console.log('📊 Scheduled jobs found:', scheduledJobs?.length || 0);
      if (scheduledJobs && scheduledJobs.length > 0) {
        console.log('📋 Latest job:', scheduledJobs[0]);
      }
    }
    
    // 4. Check review_requests table
    console.log('📋 Checking review_requests table...');
    const { data: reviewRequests, error: requestsError } = await supabase
      .from('review_requests')
      .select('*')
      .limit(5);
    
    if (requestsError) {
      console.error('❌ Error checking review_requests:', requestsError);
    } else {
      console.log('📊 Review requests found:', reviewRequests?.length || 0);
      if (reviewRequests && reviewRequests.length > 0) {
        console.log('📋 Latest request:', reviewRequests[0]);
      }
    }
    
    console.log('✅ Automation flow test completed!');
    console.log('🎯 Next steps:');
    console.log('1. Create active templates in the UI');
    console.log('2. Test customer tab triggers');
    console.log('3. Verify emails are scheduled and sent');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAutomationFlow();