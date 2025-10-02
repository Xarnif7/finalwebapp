import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkReviewRequestDetails() {
  console.log('🔍 Checking review request details...\n');
  
  try {
    // Get the specific review requests that were created today
    const { data: reviewRequests, error: requestError } = await supabase
      .from('review_requests')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .eq('id', 'd1412ebc-c02e-4992-9780-56d7b9d6f5f0')
      .single();
    
    if (requestError) {
      console.error('❌ Error fetching review request:', requestError);
      return;
    }
    
    console.log('📋 Review request details:');
    console.log(JSON.stringify(reviewRequests, null, 2));
    
    // Check if there are any scheduled jobs for this review request
    const { data: scheduledJobs, error: jobError } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .eq('payload->>review_request_id', 'd1412ebc-c02e-4992-9780-56d7b9d6f5f0');
    
    if (jobError) {
      console.error('❌ Error fetching scheduled jobs:', jobError);
      return;
    }
    
    console.log('\n⏰ Scheduled jobs for this review request:');
    if (scheduledJobs && scheduledJobs.length > 0) {
      scheduledJobs.forEach(job => {
        console.log(JSON.stringify(job, null, 2));
      });
    } else {
      console.log('  No scheduled jobs found');
    }
    
    // Check if there are any automation events
    const { data: automationEvents, error: eventError } = await supabase
      .from('automation_events')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (eventError) {
      console.log('ℹ️  No automation_events table or error:', eventError.message);
    } else {
      console.log('\n🎯 Recent automation events:');
      if (automationEvents && automationEvents.length > 0) {
        automationEvents.forEach(event => {
          console.log(JSON.stringify(event, null, 2));
        });
      } else {
        console.log('  No automation events found');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking review request details:', error);
  }
}

checkReviewRequestDetails();
