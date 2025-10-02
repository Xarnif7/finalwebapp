import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkExternalIdFormat() {
  console.log('🔍 Checking external_id format in database...\n');
  
  try {
    const businessId = '674fedc5-7937-4054-bffd-e4ecc22abc1d';
    
    // Get all QBO customers and their external_id values
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, full_name, external_id, external_source')
      .eq('business_id', businessId)
      .eq('external_source', 'qbo');
    
    if (error) {
      console.error('❌ Error fetching customers:', error);
      return;
    }
    
    console.log('📋 QBO Customers in database:');
    customers.forEach(customer => {
      console.log(`  - Name: ${customer.full_name}`);
      console.log(`    External ID: "${customer.external_id}" (type: ${typeof customer.external_id})`);
      console.log(`    String conversion: "${String(customer.external_id)}"`);
      console.log(`    Number conversion: ${Number(customer.external_id)}`);
      console.log('');
    });
    
    // Test specific lookups
    console.log('🧪 Testing specific lookups for customer "3":');
    
    // Test 1: String "3"
    const { data: test1 } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('external_source', 'qbo')
      .eq('external_id', '3')
      .single();
    console.log('Test 1 - String "3":', test1 ? 'FOUND' : 'NOT FOUND');
    
    // Test 2: Number 3
    const { data: test2 } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('external_source', 'qbo')
      .eq('external_id', 3)
      .single();
    console.log('Test 2 - Number 3:', test2 ? 'FOUND' : 'NOT FOUND');
    
    // Test 3: OR query
    const { data: test3 } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('external_source', 'qbo')
      .or('external_id.eq.3,external_id.eq."3"')
      .single();
    console.log('Test 3 - OR query:', test3 ? 'FOUND' : 'NOT FOUND');
    
  } catch (error) {
    console.error('❌ Error checking external_id format:', error);
  }
}

checkExternalIdFormat();
