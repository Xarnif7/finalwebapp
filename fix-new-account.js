#!/usr/bin/env node

// Script to fix new account setup
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixNewAccount(userEmail) {
  console.log(`🔧 Fixing account setup for: ${userEmail}\n`);

  try {
    // Get user ID
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    const user = users.users.find(u => u.email === userEmail);
    if (!user) {
      console.error(`❌ User ${userEmail} not found`);
      return;
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);

    // Create business record
    const businessName = `${userEmail.split('@')[0]}'s Business`;
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        name: businessName,
        created_by: user.email,
        industry: 'General',
        address: 'Unknown',
        phone: '',
        email: user.email,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (businessError) {
      console.error('❌ Error creating business:', businessError);
      return;
    }

    console.log(`✅ Created business: ${business.name} (ID: ${business.id})`);

    // Create profile record
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || userEmail.split('@')[0],
        business_id: business.id,
        onboarding_completed: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      return;
    }

    console.log(`✅ Created profile: ${profile.email} (Business ID: ${profile.business_id})`);

    // Create a test customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        business_id: business.id,
        full_name: 'Test Customer',
        email: 'test@example.com',
        phone: '+1234567890',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (customerError) {
      console.error('❌ Error creating test customer:', customerError);
      return;
    }

    console.log(`✅ Created test customer: ${customer.full_name} (ID: ${customer.id})`);

    console.log('\n🎉 Account setup complete!');
    console.log(`📧 Email: ${userEmail}`);
    console.log(`🏢 Business: ${business.name}`);
    console.log(`👤 Profile: ${profile.full_name}`);
    console.log(`👥 Test Customer: ${customer.full_name}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Get email from command line argument
const userEmail = process.argv[2];
if (!userEmail) {
  console.log('Usage: node fix-new-account.js <email>');
  console.log('Example: node fix-new-account.js xancreeper@gmail.com');
  process.exit(1);
}

fixNewAccount(userEmail);
