import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCustomerSync() {
  console.log('🔍 Checking customer sync status...\n');
  
  try {
    const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
    
    // Check all customers in Blipp
    console.log('📋 Customers in Blipp:');
    const { data: blippCustomers, error: blippError } = await supabase
      .from('customers')
      .select('id, full_name, email, external_id, external_source')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (blippError) {
      console.error('❌ Error fetching Blipp customers:', blippError);
    } else {
      console.log(`Found ${blippCustomers.length} customers in Blipp:`);
      blippCustomers.forEach(customer => {
        console.log(`  - ID: ${customer.id}, Name: ${customer.full_name}, External ID: ${customer.external_id}, Source: ${customer.external_source}`);
      });
    }
    
    // Check if customer with external_id "3" exists
    console.log('\n🔍 Looking for customer with external_id "3":');
    const { data: customer3, error: customer3Error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('external_id', '3')
      .eq('external_source', 'qbo')
      .single();
    
    if (customer3Error) {
      console.log('❌ Customer with external_id "3" not found in Blipp');
      console.log('This means the customer exists in QuickBooks but was never synced to Blipp');
    } else {
      console.log('✅ Customer with external_id "3" found:', customer3.full_name);
    }
    
    // Check QBO integration status
    console.log('\n🔍 QuickBooks integration status:');
    const { data: qboIntegration, error: qboError } = await supabase
      .from('integrations_quickbooks')
      .select('*')
      .eq('business_id', businessId)
      .single();
    
    if (qboError) {
      console.error('❌ Error fetching QBO integration:', qboError);
    } else {
      console.log('QBO Integration:', {
        id: qboIntegration.id,
        realm_id: qboIntegration.realm_id,
        last_sync_at: qboIntegration.last_sync_at,
        last_webhook_at: qboIntegration.last_webhook_at,
        status: qboIntegration.status
      });
    }
    
    console.log('\n💡 Solutions:');
    console.log('1. Re-sync customers from QuickBooks to Blipp');
    console.log('2. Check if customer "3" exists in QuickBooks');
    console.log('3. Verify QBO integration is working properly');
    
  } catch (error) {
    console.error('❌ Error checking customer sync:', error);
  }
}

checkCustomerSync();
