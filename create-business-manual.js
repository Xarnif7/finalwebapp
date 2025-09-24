#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createBusinessManually() {
  console.log('🔧 Creating business manually...\n');

  try {
    // First, let's try to create the business record without the trigger
    // by temporarily disabling it or using a different approach
    
    // Try to create with minimal fields first
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        name: 'xancreeper Business',
        created_by: 'xancreeper@gmail.com',
        industry: 'General'
      })
      .select()
      .single();

    if (businessError) {
      console.error('❌ Business creation failed:', businessError);
      
      // If that fails, let's try to understand what's happening
      console.log('\n🔍 Let me check the database constraints...');
      
      // Try to create a profile first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: '19cb93d6-b4ea-4007-a10e-81c333cdf586',
          email: 'xancreeper@gmail.com',
          full_name: 'xancreeper',
          onboarding_completed: false
        })
        .select()
        .single();

      if (profileError) {
        console.error('❌ Profile creation also failed:', profileError);
      } else {
        console.log('✅ Profile created:', profile);
      }
      
      return;
    }

    console.log('✅ Business created:', business);

    // Now create the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: '19cb93d6-b4ea-4007-a10e-81c333cdf586',
        email: 'xancreeper@gmail.com',
        full_name: 'xancreeper',
        business_id: business.id,
        onboarding_completed: false
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Profile creation failed:', profileError);
      return;
    }

    console.log('✅ Profile created:', profile);

    // Create a test customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        business_id: business.id,
        full_name: 'Test Customer',
        email: 'test@example.com',
        phone: '+1234567890'
      })
      .select()
      .single();

    if (customerError) {
      console.error('❌ Customer creation failed:', customerError);
      return;
    }

    console.log('✅ Customer created:', customer);

    console.log('\n🎉 Account setup complete!');
    console.log(`📧 Email: xancreeper@gmail.com`);
    console.log(`🏢 Business: ${business.name} (ID: ${business.id})`);
    console.log(`👤 Profile: ${profile.full_name}`);
    console.log(`👥 Test Customer: ${customer.full_name}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createBusinessManually();
