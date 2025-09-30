const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🔄 Applying private_feedback migration...');
  
  try {
    // Add business_id column
    console.log('Adding business_id column...');
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.private_feedback 
        ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
      `
    });

    // Add customer_name column
    console.log('Adding customer_name column...');
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.private_feedback 
        ADD COLUMN IF NOT EXISTS customer_name TEXT;
      `
    });

    // Add customer_email column
    console.log('Adding customer_email column...');
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.private_feedback 
        ADD COLUMN IF NOT EXISTS customer_email TEXT;
      `
    });

    // Add source column
    console.log('Adding source column...');
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.private_feedback 
        ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'review_request';
      `
    });

    // Make review_request_id nullable
    console.log('Making review_request_id nullable...');
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.private_feedback 
        ALTER COLUMN review_request_id DROP NOT NULL;
      `
    });

    // Add constraint
    console.log('Adding constraint...');
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.private_feedback 
        ADD CONSTRAINT check_business_or_review_request 
        CHECK (
          (business_id IS NOT NULL AND review_request_id IS NULL) OR 
          (business_id IS NULL AND review_request_id IS NOT NULL)
        );
      `
    });

    // Add indexes
    console.log('Adding indexes...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_private_feedback_business_id ON public.private_feedback(business_id);
        CREATE INDEX IF NOT EXISTS idx_private_feedback_source ON public.private_feedback(source);
      `
    });

    // Update RLS policy
    console.log('Updating RLS policy...');
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users can manage their own business private feedback" ON public.private_feedback;
        
        CREATE POLICY "Users can manage their own business private feedback" ON public.private_feedback
        FOR ALL USING (
          business_id IN (
            SELECT b.id FROM public.businesses b 
            WHERE b.created_by = auth.uid()
          )
          OR
          review_request_id IN (
            SELECT rr.id FROM public.review_requests rr
            JOIN public.businesses b ON rr.business_id = b.id
            WHERE b.created_by = auth.uid()
          )
        );
      `
    });

    console.log('✅ Migration applied successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
