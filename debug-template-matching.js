import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugTemplateMatching() {
  console.log('🔍 Debugging template matching for QBO webhook...\n');
  
  try {
    // Get the recent review requests that were triggered
    const { data: recentRequests, error: requestError } = await supabase
      .from('review_requests')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .order('created_at', { ascending: false })
      .limit(2);
    
    if (requestError) {
      console.error('❌ Error fetching review requests:', requestError);
      return;
    }
    
    console.log('📋 Recent triggered review requests:');
    recentRequests.forEach(req => {
      console.log(`  - ID: ${req.id}`);
      console.log(`    Message: "${req.message}"`);
      console.log(`    Created: ${req.created_at}`);
      console.log('');
    });
    
    // Get all automation templates for this business
    const { data: templates, error: templatesError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .eq('status', 'active');
    
    if (templatesError) {
      console.error('❌ Error fetching templates:', templatesError);
      return;
    }
    
    console.log('🎯 Your active automation templates:');
    templates.forEach(template => {
      console.log(`  - ID: ${template.id}`);
      console.log(`    Name: "${template.name}"`);
      console.log(`    Key: "${template.key}"`);
      console.log(`    Custom Message: "${template.custom_message || 'N/A'}"`);
      console.log(`    Config JSON: ${JSON.stringify(template.config_json, null, 2)}`);
      console.log(`    Channels: ${JSON.stringify(template.channels)}`);
      console.log('');
    });
    
    // Check scheduled jobs to see which template was used
    const { data: scheduledJobs, error: jobError } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .eq('job_type', 'automation_email')
      .order('created_at', { ascending: false })
      .limit(2);
    
    if (jobError) {
      console.error('❌ Error fetching scheduled jobs:', jobError);
      return;
    }
    
    console.log('⏰ Recent scheduled jobs with template info:');
    scheduledJobs.forEach(job => {
      console.log(`  - Job ID: ${job.id}`);
      console.log(`    Status: ${job.status}`);
      console.log(`    Run at: ${job.run_at}`);
      console.log(`    Payload: ${JSON.stringify(job.payload, null, 2)}`);
      console.log('');
    });
    
    // Check if there are any QBO integrations to see the realm_id
    const { data: qboIntegrations, error: qboError } = await supabase
      .from('integrations_quickbooks')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d');
    
    if (qboError) {
      console.error('❌ Error fetching QBO integrations:', qboError);
      return;
    }
    
    console.log('🔗 QBO Integration details:');
    if (qboIntegrations && qboIntegrations.length > 0) {
      qboIntegrations.forEach(integration => {
        console.log(`  - Realm ID: ${integration.realm_id}`);
        console.log(`    Status: ${integration.connection_status}`);
        console.log(`    Last Webhook: ${integration.last_webhook_at || 'Never'}`);
        console.log('');
      });
    } else {
      console.log('  No QBO integrations found');
    }
    
    // Let's also check if there are any message_templates (old system)
    const { data: messageTemplates, error: messageError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('business_id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .eq('is_active', true);
    
    if (messageError) {
      console.log('ℹ️  No message_templates table or error:', messageError.message);
    } else {
      console.log('📝 Message templates (old system):');
      if (messageTemplates && messageTemplates.length > 0) {
        messageTemplates.forEach(template => {
          console.log(`  - ID: ${template.id}`);
          console.log(`    Name: "${template.name}"`);
          console.log(`    Content: "${template.content}"`);
          console.log('');
        });
      } else {
        console.log('  No message templates found');
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging template matching:', error);
  }
}

debugTemplateMatching();
