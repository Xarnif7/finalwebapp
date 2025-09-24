#!/usr/bin/env node

// Debug script to check what's wrong with the new account
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugAccount() {
  console.log('🔍 Debugging new account setup...\n');

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`📊 Found ${users.users.length} users:`);
    users.users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (ID: ${user.id})`);
    });

    // Get all businesses
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('*');

    if (businessesError) {
      console.error('❌ Error fetching businesses:', businessesError);
      return;
    }

    console.log(`\n🏢 Found ${businesses.length} businesses:`);
    businesses.forEach((business, index) => {
      console.log(`  ${index + 1}. ${business.name} (Created by: ${business.created_by})`);
    });

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }

    console.log(`\n👤 Found ${profiles.length} profiles:`);
    profiles.forEach((profile, index) => {
      console.log(`  ${index + 1}. ${profile.email} (Business ID: ${profile.business_id})`);
    });

    // Check for users without businesses
    console.log('\n🔍 Checking for users without businesses:');
    users.users.forEach(user => {
      const hasBusiness = businesses.some(b => b.created_by === user.email);
      const hasProfile = profiles.some(p => p.email === user.email);
      
      if (!hasBusiness) {
        console.log(`❌ User ${user.email} has no business record`);
      }
      if (!hasProfile) {
        console.log(`❌ User ${user.email} has no profile record`);
      }
      if (hasBusiness && hasProfile) {
        console.log(`✅ User ${user.email} is properly set up`);
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugAccount();
