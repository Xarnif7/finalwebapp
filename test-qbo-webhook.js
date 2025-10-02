#!/usr/bin/env node

/**
 * Test script for QuickBooks webhook integration
 * Tests the complete flow: QBO webhook -> customer matching -> template selection -> automation trigger
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test data
const TEST_BUSINESS_ID = '674fedc5-7937-4054-bffd-e4ecc22abc1d'; // Replace with actual business ID
const TEST_REALM_ID = '123456789'; // Replace with actual QBO realm ID
const TEST_CUSTOMER_EMAIL = 'test@example.com';

async function testQboWebhookIntegration() {
  console.log('🧪 Testing QuickBooks webhook integration...\n');

  try {
    // 1. Test customer matching
    console.log('1️⃣ Testing customer matching...');
    const externalId = `12345`; // Simulated QBO customer ID (without qbo_ prefix)
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name, email, phone')
      .eq('business_id', TEST_BUSINESS_ID)
      .eq('external_source', 'qbo')
      .eq('external_id', externalId)
      .single();

    if (customerError || !customer) {
      console.log('⚠️  No QBO customer found, creating test customer...');
      
      // Create a test customer
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          business_id: TEST_BUSINESS_ID,
          full_name: 'Test Customer',
          email: TEST_CUSTOMER_EMAIL,
          phone: '+1234567890',
          external_source: 'qbo',
          external_id: externalId,
          source: 'quickbooks',
          status: 'active'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create test customer:', createError);
        return;
      }
      
      console.log('✅ Test customer created:', newCustomer.id);
    } else {
      console.log('✅ Customer found:', customer.id);
    }

    // 2. Test template matching
    console.log('\n2️⃣ Testing template matching...');
    const { data: templates, error: templatesError } = await supabase
      .from('automation_templates')
      .select('id, name, key, status, config_json, channels')
      .eq('business_id', TEST_BUSINESS_ID)
      .eq('status', 'active');

    if (templatesError || !templates || templates.length === 0) {
      console.log('⚠️  No automation templates found, creating test template...');
      
      // Create a test template
      const { data: newTemplate, error: createTemplateError } = await supabase
        .from('automation_templates')
        .insert({
          business_id: TEST_BUSINESS_ID,
          name: 'Invoice Sent Follow-up',
          key: 'invoice_sent',
          status: 'active',
          channels: ['email'],
          config_json: {
            message: 'Thank you for your business! Please consider leaving us a review.',
            delay_hours: 24,
            triggers: {
              invoice_sent: true
            }
          }
        })
        .select()
        .single();

      if (createTemplateError) {
        console.error('❌ Failed to create test template:', createTemplateError);
        return;
      }
      
      console.log('✅ Test template created:', newTemplate.id);
    } else {
      console.log('✅ Found templates:', templates.length);
      templates.forEach(t => console.log(`   - ${t.name} (${t.key})`));
    }

    // 3. Test webhook payload simulation
    console.log('\n3️⃣ Testing webhook payload simulation...');
    
    const webhookPayload = {
      eventNotifications: [{
        realmId: TEST_REALM_ID,
        dataChangeEvent: {
          entities: [{
            name: 'Invoice',
            id: '12345',
            operation: 'Update'
          }],
          lastUpdated: new Date().toISOString()
        }
      }]
    };

    // Simulate webhook signature
    const webhookVerifierToken = process.env.QBO_WEBHOOK_VERIFIER_TOKEN || 'test-token';
    const signature = crypto
      .createHmac('sha256', webhookVerifierToken)
      .update(JSON.stringify(webhookPayload))
      .digest('base64');

    console.log('✅ Webhook payload prepared with signature');

    // 4. Test webhook endpoint
    console.log('\n4️⃣ Testing webhook endpoint...');
    
    const webhookUrl = 'http://localhost:3001/api/qbo/webhook';
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'intuit-signature': signature
      },
      body: JSON.stringify(webhookPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Webhook request failed:', response.status, errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Webhook response:', result);

    // 5. Check if review request was created
    console.log('\n5️⃣ Checking review request creation...');
    
    const { data: reviewRequests, error: reviewError } = await supabase
      .from('review_requests')
      .select('*')
      .eq('business_id', TEST_BUSINESS_ID)
      .eq('external_source', 'qbo_webhook')
      .order('created_at', { ascending: false })
      .limit(1);

    if (reviewError) {
      console.error('❌ Failed to check review requests:', reviewError);
      return;
    }

    if (reviewRequests && reviewRequests.length > 0) {
      console.log('✅ Review request created:', reviewRequests[0].id);
      console.log('   Status:', reviewRequests[0].status);
      console.log('   Trigger type:', reviewRequests[0].trigger_type);
    } else {
      console.log('⚠️  No review request found');
    }

    // 6. Check if scheduled job was created
    console.log('\n6️⃣ Checking scheduled job creation...');
    
    const { data: scheduledJobs, error: jobError } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .eq('business_id', TEST_BUSINESS_ID)
      .eq('job_type', 'automation_email')
      .order('created_at', { ascending: false })
      .limit(1);

    if (jobError) {
      console.error('❌ Failed to check scheduled jobs:', jobError);
      return;
    }

    if (scheduledJobs && scheduledJobs.length > 0) {
      console.log('✅ Scheduled job created:', scheduledJobs[0].id);
      console.log('   Run at:', scheduledJobs[0].run_at);
      console.log('   Status:', scheduledJobs[0].status);
    } else {
      console.log('⚠️  No scheduled job found');
    }

    console.log('\n🎉 QBO webhook integration test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testQboWebhookIntegration();
