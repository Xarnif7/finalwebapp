import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugWebhookFlow() {
  console.log('🔍 Debugging webhook flow to find message source...\n');
  
  try {
    // Get the most recent review request
    const { data: recentRequest, error: requestError } = await supabase
      .from('review_requests')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (requestError) {
      console.error('❌ Error fetching recent request:', requestError);
      return;
    }
    
    if (recentRequest && recentRequest.length > 0) {
      const request = recentRequest[0];
      console.log('📋 Most recent review request:');
      console.log(`  - ID: ${request.id}`);
      console.log(`  - Message: "${request.message}"`);
      console.log(`  - Created: ${request.created_at}`);
      console.log(`  - Status: ${request.status}`);
      console.log('');
      
      // Check if there's a template_id
      if (request.template_id) {
        console.log(`  - Template ID: ${request.template_id}`);
        
        // Get the template details
        const { data: template, error: templateError } = await supabase
          .from('automation_templates')
          .select('*')
          .eq('id', request.template_id)
          .single();
        
        if (templateError) {
          console.error('❌ Error fetching template:', templateError);
        } else if (template) {
          console.log('🎯 Template details:');
          console.log(`  - Name: "${template.name}"`);
          console.log(`  - Custom Message: "${template.custom_message || 'N/A'}"`);
          console.log(`  - Config Message: "${template.config_json?.message || 'N/A'}"`);
          console.log(`  - Status: ${template.status}`);
          console.log('');
        }
      } else {
        console.log('  - No template_id found (this is the problem!)');
      }
    }
    
    // Check scheduled jobs for this request
    const { data: scheduledJobs, error: jobError } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (jobError) {
      console.error('❌ Error fetching scheduled jobs:', jobError);
      return;
    }
    
    console.log('⏰ Recent scheduled jobs:');
    if (scheduledJobs && scheduledJobs.length > 0) {
      scheduledJobs.forEach(job => {
        console.log(`  - Job ID: ${job.id}`);
        console.log(`    Type: ${job.job_type}`);
        console.log(`    Status: ${job.status}`);
        console.log(`    Template ID: ${job.template_id || 'N/A'}`);
        console.log(`    Payload: ${JSON.stringify(job.payload, null, 2)}`);
        console.log('');
      });
    }
    
    // Check your current Invoice Paid template
    const { data: invoiceTemplate, error: templateError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .eq('key', 'invoice_paid')
      .single();
    
    if (templateError) {
      console.error('❌ Error fetching invoice template:', templateError);
    } else if (invoiceTemplate) {
      console.log('🎯 Your Invoice Paid template:');
      console.log(`  - ID: ${invoiceTemplate.id}`);
      console.log(`  - Name: "${invoiceTemplate.name}"`);
      console.log(`  - Custom Message: "${invoiceTemplate.custom_message || 'N/A'}"`);
      console.log(`  - Config Message: "${invoiceTemplate.config_json?.message || 'N/A'}"`);
      console.log(`  - Status: ${invoiceTemplate.status}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error debugging webhook flow:', error);
  }
}

debugWebhookFlow();
