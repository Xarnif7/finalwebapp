// Test script to simulate failures and trigger alerts
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateFailures() {
  console.log('🧪 Simulating Failures to Trigger Alerts...\n');

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

    // Simulate multiple failures to trigger alert
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    
    console.log('📤 Simulating message sends and failures...');
    
    // Simulate 10 sends with 3 failures (30% failure rate - above 10% threshold)
    for (let i = 0; i < 10; i++) {
      const isFailure = i < 3; // First 3 are failures
      
      try {
        const response = await fetch(`${baseUrl}/api/automation-metrics`, {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token', // This will fail auth, simulating failures
            'Content-Type': 'application/json'
          }
        });

        if (isFailure) {
          console.log(`   ❌ Simulated failure ${i + 1}/10`);
        } else {
          console.log(`   ✅ Simulated success ${i + 1}/10`);
        }
      } catch (error) {
        console.log(`   ❌ Simulated failure ${i + 1}/10: ${error.message}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Checking metrics...');
    
    // Check metrics endpoint
    try {
      const response = await fetch(`${baseUrl}/api/automation-metrics`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📈 Current Metrics:', data.metrics);
        
        if (data.metrics.hasAlert) {
          console.log('🚨 ALERT TRIGGERED!');
          console.log(`   Alert Message: ${data.metrics.alertMessage}`);
          console.log(`   Failure Rate: ${data.metrics.failureRate}%`);
          console.log(`   Threshold: ${data.metrics.threshold}%`);
        } else {
          console.log('✅ No alerts triggered');
        }
      } else {
        console.log('❌ Failed to fetch metrics (expected due to auth)');
      }
    } catch (error) {
      console.log('❌ Error fetching metrics:', error.message);
    }

    console.log('\n🎉 Failure simulation completed!');
    console.log('\n📋 What to check:');
    console.log('   • Check the Automations page for alert banner');
    console.log('   • Look for "High Failure Rate Alert" banner');
    console.log('   • Verify metrics show high failure rate');
    console.log('   • Test dismissing the alert banner');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
simulateFailures();
