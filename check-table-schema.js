// Check table schema
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xvzkrctudezyasinskyo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  try {
    console.log('🔍 Checking table schemas...');
    
    // Check review_requests table
    console.log('📋 Checking review_requests table...');
    const { data: requests, error: requestsError } = await supabase
      .from('review_requests')
      .select('*')
      .limit(1);
    
    if (requestsError) {
      console.error('❌ review_requests error:', requestsError);
    } else {
      console.log('✅ review_requests columns:', requests?.[0] ? Object.keys(requests[0]) : 'No data');
    }
    
    // Check scheduled_jobs table
    console.log('📋 Checking scheduled_jobs table...');
    const { data: jobs, error: jobsError } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .limit(1);
    
    if (jobsError) {
      console.error('❌ scheduled_jobs error:', jobsError);
    } else {
      console.log('✅ scheduled_jobs columns:', jobs?.[0] ? Object.keys(jobs[0]) : 'No data');
    }
    
    // Check automation_templates table
    console.log('📋 Checking automation_templates table...');
    const { data: templates, error: templatesError } = await supabase
      .from('automation_templates')
      .select('*')
      .limit(1);
    
    if (templatesError) {
      console.error('❌ automation_templates error:', templatesError);
    } else {
      console.log('✅ automation_templates columns:', templates?.[0] ? Object.keys(templates[0]) : 'No data');
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

checkSchema();
