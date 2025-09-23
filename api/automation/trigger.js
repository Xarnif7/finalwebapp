import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customer_id, trigger_type, trigger_data } = req.body;

    // Validate required fields
    if (!customer_id || !trigger_type) {
      return res.status(400).json({ 
        error: 'Missing required fields: customer_id, trigger_type' 
      });
    }

    // Validate trigger_type
    const validTriggers = ['job_completed', 'invoice_paid', 'service_completed', 'customer_created', 'manual_trigger'];
    if (!validTriggers.includes(trigger_type)) {
      return res.status(400).json({ 
        error: 'Invalid trigger_type. Must be one of: ' + validTriggers.join(', ') 
      });
    }

    // Get user from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user's business_id using email-based lookup
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('created_by', user.email)
      .single();

    if (businessError || !business) {
      return res.status(400).json({ error: 'User not associated with a business' });
    }

    // Verify customer belongs to business
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name, email, phone')
      .eq('id', customer_id)
      .eq('business_id', business.id)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // For manual triggers, create a review request directly
    if (trigger_type === 'manual_trigger') {
      const { template_id, template_name, template_message, delay_hours, channels } = trigger_data;
      
      // Generate review link
      const reviewLink = `${process.env.APP_BASE_URL || 'https://myblipp.com'}/r/${Math.random().toString(36).substring(2, 10)}`;
      
      // Create review request entry
      const { data: reviewRequest, error: requestError } = await supabase
        .from('review_requests')
        .insert({
          business_id: business.id,
          customer_id: customer_id,
          channel: channels?.[0] || 'email',
          review_link: reviewLink,
          message: template_message || 'Thank you for your business! Please consider leaving us a review.',
          email_status: 'pending',
          sms_status: 'skipped',
          requested_at: new Date().toISOString()
        })
        .select()
        .single();

      if (requestError) {
        console.error('Error creating review request:', requestError);
        return res.status(500).json({ error: 'Failed to create review request' });
      }

      // Schedule the email to be sent after the delay
      const sendTime = new Date();
      sendTime.setHours(sendTime.getHours() + (delay_hours || 24));
      
      const { error: scheduleError } = await supabase
        .from('scheduled_jobs')
        .insert({
          job_type: 'automation_email',
          payload: {
            review_request_id: reviewRequest.id,
            business_id: business.id,
            template_id: template_id,
            template_name: template_name
          },
          run_at: sendTime.toISOString(),
          status: 'queued'
        });

      if (scheduleError) {
        console.error('Error scheduling automation email:', scheduleError);
        return res.status(500).json({ error: 'Failed to schedule automation email' });
      }

      return res.status(200).json({ 
        success: true, 
        message: `${template_name} automation triggered successfully`,
        review_request_id: reviewRequest.id,
        scheduled_for: sendTime.toISOString(),
        customer_name: customer.full_name
      });
    }

    // For other trigger types, use the existing database function
    const { data: executionId, error: triggerError } = await supabase
      .rpc('trigger_automation', {
        p_business_id: business.id,
        p_customer_id: customer_id,
        p_trigger_type: trigger_type,
        p_trigger_data: trigger_data || {}
      });

    if (triggerError) {
      console.error('Error triggering automation:', triggerError);
      return res.status(500).json({ error: 'Failed to trigger automation' });
    }

    // Log the trigger event
    await supabase.rpc('log_telemetry_event', {
      p_business_id: business.id,
      p_event_type: 'automation_triggered',
      p_event_data: { 
        trigger_type, 
        customer_id, 
        execution_id: executionId,
        trigger_data 
      }
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Automation triggered successfully',
      execution_id: executionId,
      customer_name: customer.full_name
    });

  } catch (error) {
    console.error('Error in automation trigger:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}