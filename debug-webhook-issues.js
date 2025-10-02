import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugWebhookIssues() {
  console.log('🔍 Debugging webhook issues...\n');
  
  try {
    // Check recent review requests
    const { data: recentRequests, error: requestError } = await supabase
      .from('review_requests')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (requestError) {
      console.error('❌ Error fetching review requests:', requestError);
      return;
    }
    
    console.log('📋 Recent review requests:');
    if (recentRequests && recentRequests.length > 0) {
      recentRequests.forEach(req => {
        const isToday = new Date(req.created_at).toDateString() === new Date().toDateString();
        console.log(`  - ID: ${req.id}`);
        console.log(`    Message: "${req.message}"`);
        console.log(`    Status: ${req.status}`);
        console.log(`    Created: ${req.created_at} ${isToday ? '🆕 TODAY' : ''}`);
        console.log('');
      });
    } else {
      console.log('  No recent review requests found');
    }
    
    // Check recent scheduled jobs
    const { data: scheduledJobs, error: jobError } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (jobError) {
      console.error('❌ Error fetching scheduled jobs:', jobError);
      return;
    }
    
    console.log('⏰ Recent scheduled jobs:');
    if (scheduledJobs && scheduledJobs.length > 0) {
      scheduledJobs.forEach(job => {
        const isToday = new Date(job.created_at).toDateString() === new Date().toDateString();
        console.log(`  - Job ID: ${job.id}`);
        console.log(`    Type: ${job.job_type}`);
        console.log(`    Status: ${job.status}`);
        console.log(`    Run at: ${job.run_at}`);
        console.log(`    Created: ${job.created_at} ${isToday ? '🆕 TODAY' : ''}`);
        console.log(`    Payload: ${JSON.stringify(job.payload, null, 2)}`);
        console.log('');
      });
    } else {
      console.log('  No recent scheduled jobs found');
    }
    
    // Check your current templates
    const { data: templates, error: templateError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .in('status', ['active', 'ready']);
    
    if (templateError) {
      console.error('❌ Error fetching templates:', templateError);
      return;
    }
    
    console.log('🎯 Your current templates:');
    if (templates && templates.length > 0) {
      templates.forEach(template => {
        console.log(`  - ID: ${template.id}`);
        console.log(`    Name: "${template.name}"`);
        console.log(`    Key: "${template.key}"`);
        console.log(`    Status: ${template.status}`);
        console.log(`    Custom Message: "${template.custom_message || 'N/A'}"`);
        console.log(`    Config Message: "${template.config_json?.message || 'N/A'}"`);
        console.log('');
      });
    } else {
      console.log('  No templates found');
    }
    
  } catch (error) {
    console.error('❌ Error debugging webhook issues:', error);
  }
}

debugWebhookIssues();
