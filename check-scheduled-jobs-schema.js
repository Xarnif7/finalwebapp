// Check scheduled_jobs schema
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xvzkrctudezyasinskyo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkScheduledJobsSchema() {
  try {
    console.log('🔍 Checking scheduled_jobs schema...');
    
    // Try to create a minimal job to see the schema
    const { data: job, error: jobError } = await supabase
      .from('scheduled_jobs')
      .insert({
        job_type: 'test',
        payload: { test: true },
        run_at: new Date().toISOString(),
        status: 'queued'
      })
      .select()
      .single();
    
    if (jobError) {
      console.error('❌ Error creating test job:', jobError);
      
      // Try with business_id
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .limit(1)
        .single();
      
      if (business) {
        const { data: job2, error: job2Error } = await supabase
          .from('scheduled_jobs')
          .insert({
            business_id: business.id,
            job_type: 'test',
            payload: { test: true },
            run_at: new Date().toISOString(),
            status: 'queued'
          })
          .select()
          .single();
        
        if (job2Error) {
          console.error('❌ Error with business_id:', job2Error);
        } else {
          console.log('✅ Job created with business_id:', Object.keys(job2));
          // Cleanup
          await supabase.from('scheduled_jobs').delete().eq('id', job2.id);
        }
      }
    } else {
      console.log('✅ Job created:', Object.keys(job));
      // Cleanup
      await supabase.from('scheduled_jobs').delete().eq('id', job.id);
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

checkScheduledJobsSchema();
