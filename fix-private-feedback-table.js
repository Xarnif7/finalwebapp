import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPrivateFeedbackTable() {
  console.log('🔄 Fixing private_feedback table for QR feedback...');
  
  try {
    // 1. Add business_id column
    console.log('1. Adding business_id column...');
    const { error: error1 } = await supabase
      .from('private_feedback')
      .select('business_id')
      .limit(1);
    
    if (error1 && error1.code === 'PGRST204') {
      // Column doesn't exist, add it
      console.log('   Column does not exist, adding it...');
      // We'll need to use raw SQL for this
      console.log('   Note: This requires manual SQL execution in Supabase dashboard');
    } else {
      console.log('   Column already exists');
    }

    // 2. Add customer_name column
    console.log('2. Adding customer_name column...');
    const { error: error2 } = await supabase
      .from('private_feedback')
      .select('customer_name')
      .limit(1);
    
    if (error2 && error2.code === 'PGRST204') {
      console.log('   Column does not exist, needs to be added');
    } else {
      console.log('   Column already exists');
    }

    // 3. Add customer_email column
    console.log('3. Adding customer_email column...');
    const { error: error3 } = await supabase
      .from('private_feedback')
      .select('customer_email')
      .limit(1);
    
    if (error3 && error3.code === 'PGRST204') {
      console.log('   Column does not exist, needs to be added');
    } else {
      console.log('   Column already exists');
    }

    // 4. Add source column
    console.log('4. Adding source column...');
    const { error: error4 } = await supabase
      .from('private_feedback')
      .select('source')
      .limit(1);
    
    if (error4 && error4.code === 'PGRST204') {
      console.log('   Column does not exist, needs to be added');
    } else {
      console.log('   Column already exists');
    }

    console.log('\n📋 Manual steps required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the following SQL:');
    console.log(`
-- Add business_id column
ALTER TABLE public.private_feedback 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Add customer_name column
ALTER TABLE public.private_feedback 
ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Add customer_email column
ALTER TABLE public.private_feedback 
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Add source column
ALTER TABLE public.private_feedback 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'review_request';

-- Make review_request_id nullable
ALTER TABLE public.private_feedback 
ALTER COLUMN review_request_id DROP NOT NULL;

-- Add constraint
ALTER TABLE public.private_feedback 
ADD CONSTRAINT check_business_or_review_request 
CHECK (
  (business_id IS NOT NULL AND review_request_id IS NULL) OR 
  (business_id IS NULL AND review_request_id IS NOT NULL)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_private_feedback_business_id ON public.private_feedback(business_id);
CREATE INDEX IF NOT EXISTS idx_private_feedback_source ON public.private_feedback(source);
    `);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixPrivateFeedbackTable();
