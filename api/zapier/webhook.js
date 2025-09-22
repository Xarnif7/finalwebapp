import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id, template_id, action, timestamp } = req.body;

    if (!business_id || !template_id || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get template details
    const { data: template, error: templateError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('id', template_id)
      .eq('business_id', business_id)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Log the webhook event
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        business_id,
        template_id,
        action,
        payload: req.body,
        timestamp: timestamp || new Date().toISOString(),
        status: 'received'
      });

    if (logError) {
      console.error('Error logging webhook:', logError);
    }

    // Process the webhook action
    switch (action) {
      case 'activate':
        await handleActivateTemplate(template);
        break;
      case 'pause':
        await handlePauseTemplate(template);
        break;
      case 'update':
        await handleUpdateTemplate(template);
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }

    res.status(200).json({ 
      success: true, 
      message: `Webhook processed for ${action}`,
      template_id,
      business_id
    });

  } catch (error) {
    console.error('Error processing Zapier webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleActivateTemplate(template) {
  console.log(`Activating template: ${template.name}`);
  
  // Here you would integrate with Zapier to create/update the webhook
  // For now, we'll just log it
  console.log('Zapier Integration:', {
    action: 'create_webhook',
    template_name: template.name,
    trigger_event: template.key,
    channels: template.channels,
    config: template.config_json
  });

  // In a real implementation, you would:
  // 1. Call Zapier API to create a webhook
  // 2. Store the webhook URL/ID in the template
  // 3. Set up the automation flow
}

async function handlePauseTemplate(template) {
  console.log(`Pausing template: ${template.name}`);
  
  // Here you would integrate with Zapier to pause the webhook
  console.log('Zapier Integration:', {
    action: 'pause_webhook',
    template_name: template.name
  });
}

async function handleUpdateTemplate(template) {
  console.log(`Updating template: ${template.name}`);
  
  // Here you would integrate with Zapier to update the webhook
  console.log('Zapier Integration:', {
    action: 'update_webhook',
    template_name: template.name,
    new_config: template.config_json
  });
}
