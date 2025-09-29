/*
  Quick script to inspect review_requests table structure
  Usage: node scripts/inspect-review-requests.js
*/

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function inspectReviewRequests() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🔍 Inspecting review_requests table...\n');

    // Get table structure
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'review_requests' });

    if (columnsError) {
      console.log('❌ Error getting columns:', columnsError);
      // Fallback: try to get one sample row
      const { data: sample, error: sampleError } = await supabase
        .from('review_requests')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.log('❌ Error getting sample:', sampleError);
        return;
      }
      
      console.log('📋 Available columns (from sample):');
      if (sample && sample.length > 0) {
        Object.keys(sample[0]).forEach(col => {
          console.log(`  - ${col}`);
        });
      } else {
        console.log('  (table is empty)');
      }
      return;
    }

    console.log('📋 Table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : '(optional)'}`);
    });

    // Get sample data
    const { data: sample, error: sampleError } = await supabase
      .from('review_requests')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.log('❌ Error getting sample:', sampleError);
    } else if (sample && sample.length > 0) {
      console.log('\n📄 Sample row:');
      console.log(JSON.stringify(sample[0], null, 2));
    } else {
      console.log('\n📄 Table is empty (no sample data)');
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

inspectReviewRequests();
