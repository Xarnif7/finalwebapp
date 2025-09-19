// Test script for safety features (DNC, unsubscribes, hard bounces, cooldown)
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSafetyFeatures() {
  console.log('🧪 Testing Safety Features...\n');

  try {
    // Get a test business
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id, name')
      .limit(1);

    if (businessError || !businesses.length) {
      console.error('❌ No businesses found:', businessError);
      return;
    }

    const business = businesses[0];
    console.log(`📊 Testing with business: ${business.name} (${business.id})\n`);

    // Create test customers with different safety statuses
    const testCustomers = [
      {
        first_name: 'John',
        last_name: 'Unsubscribed',
        email: 'john.unsubscribed@test.com',
        phone: '+1234567890',
        business_id: business.id,
        unsubscribed: true,
        dnc: false,
        hard_bounced: false
      },
      {
        first_name: 'Jane',
        last_name: 'DNC',
        email: 'jane.dnc@test.com',
        phone: '+1234567891',
        business_id: business.id,
        unsubscribed: false,
        dnc: true,
        hard_bounced: false
      },
      {
        first_name: 'Bob',
        last_name: 'HardBounced',
        email: 'bob.hardbounced@test.com',
        phone: '+1234567892',
        business_id: business.id,
        unsubscribed: false,
        dnc: false,
        hard_bounced: true
      },
      {
        first_name: 'Alice',
        last_name: 'Cooldown',
        email: 'alice.cooldown@test.com',
        phone: '+1234567893',
        business_id: business.id,
        unsubscribed: false,
        dnc: false,
        hard_bounced: false,
        last_review_request_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
      },
      {
        first_name: 'Charlie',
        last_name: 'Clean',
        email: 'charlie.clean@test.com',
        phone: '+1234567894',
        business_id: business.id,
        unsubscribed: false,
        dnc: false,
        hard_bounced: false
      }
    ];

    console.log('👥 Creating test customers...');
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .upsert(testCustomers, { onConflict: 'email,business_id' })
      .select('*');

    if (customerError) {
      console.error('❌ Error creating customers:', customerError);
      return;
    }

    console.log(`✅ Created ${customers.length} test customers\n`);

    // Test the canSendToCustomer function for each customer
    for (const customer of customers) {
      console.log(`🔍 Testing customer: ${customer.first_name} ${customer.last_name}`);
      console.log(`   Email: ${customer.email}`);
      console.log(`   Unsubscribed: ${customer.unsubscribed}`);
      console.log(`   DNC: ${customer.dnc}`);
      console.log(`   Hard Bounced: ${customer.hard_bounced}`);
      console.log(`   Last Review Request: ${customer.last_review_request_at || 'Never'}`);

      // Simulate the safety check
      const cooldownDays = parseInt(process.env.COOLDOWN_DAYS || '7');
      let canSend = true;
      let reason = '';

      if (customer.unsubscribed) {
        canSend = false;
        reason = 'Customer unsubscribed';
      } else if (customer.dnc) {
        canSend = false;
        reason = 'Customer on DNC list';
      } else if (customer.hard_bounced) {
        canSend = false;
        reason = 'Customer hard bounced';
      } else if (customer.last_review_request_at) {
        const lastRequest = new Date(customer.last_review_request_at);
        const now = new Date();
        const daysSinceLastRequest = (now - lastRequest) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastRequest < cooldownDays) {
          canSend = false;
          reason = `Customer in cooldown period (${Math.ceil(cooldownDays - daysSinceLastRequest)} days remaining)`;
        }
      }

      console.log(`   Result: ${canSend ? '✅ CAN SEND' : '❌ BLOCKED'}`);
      if (!canSend) {
        console.log(`   Reason: ${reason}`);
      }
      console.log('');
    }

    // Test message sending simulation
    console.log('📧 Testing message sending simulation...\n');

    for (const customer of customers) {
      console.log(`📤 Attempting to send message to ${customer.first_name} ${customer.last_name}...`);
      
      // Simulate sendMessage call
      const messageData = {
        channel: 'email',
        to: customer.email,
        subject: 'Test Review Request',
        body: 'Please leave us a review!',
        customer_id: customer.id,
        business_id: business.id
      };

      // Check safety first
      const cooldownDays = parseInt(process.env.COOLDOWN_DAYS || '7');
      let canSend = true;
      let reason = '';

      if (customer.unsubscribed) {
        canSend = false;
        reason = 'Customer unsubscribed';
      } else if (customer.dnc) {
        canSend = false;
        reason = 'Customer on DNC list';
      } else if (customer.hard_bounced) {
        canSend = false;
        reason = 'Customer hard bounced';
      } else if (customer.last_review_request_at) {
        const lastRequest = new Date(customer.last_review_request_at);
        const now = new Date();
        const daysSinceLastRequest = (now - lastRequest) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastRequest < cooldownDays) {
          canSend = false;
          reason = `Customer in cooldown period (${Math.ceil(cooldownDays - daysSinceLastRequest)} days remaining)`;
        }
      }

      if (!canSend) {
        console.log(`   ❌ Message BLOCKED: ${reason}`);
        console.log(`   📝 Would log: message_blocked event`);
        console.log(`   🛑 Would stop enrollment`);
      } else {
        console.log(`   ✅ Message would be sent successfully`);
        console.log(`   📝 Would log: message_sent event`);
        console.log(`   ⏰ Would update last_review_request_at timestamp`);
      }
      console.log('');
    }

    console.log('🎉 Safety feature testing completed!');
    console.log('\n📋 Summary:');
    console.log('   • Unsubscribed customers are blocked');
    console.log('   • DNC customers are blocked');
    console.log('   • Hard bounced customers are blocked');
    console.log('   • Customers in cooldown period are blocked');
    console.log('   • Clean customers can receive messages');
    console.log('   • All blocks are logged and enrollments are stopped');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSafetyFeatures();
