import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// HMAC validation function
function validateHMAC(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Provision default templates for a business
async function provisionDefaultTemplates(businessId) {
  try {
    console.log(`[ZAPIER_INGEST] Provisioning default templates for business: ${businessId}`);
    
    const defaultTemplates = [
      {
        business_id: businessId,
        key: 'job_completed',
        name: 'Job Completed',
        status: 'ready',
        channels: ['sms', 'email'],
        trigger_type: 'event',
        config_json: {
          message: "Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review.",
          delay_hours: 24
        }
      },
      {
        business_id: businessId,
        key: 'invoice_paid',
        name: 'Invoice Paid',
        status: 'ready',
        channels: ['email', 'sms'],
        trigger_type: 'event',
        config_json: {
          message: "Thank you for your payment! We appreciate your business. Please consider leaving us a review.",
          delay_hours: 48
        }
      },
      {
        business_id: businessId,
        key: 'service_reminder',
        name: 'Service Reminder',
        status: 'ready',
        channels: ['sms', 'email'],
        trigger_type: 'date_based',
        config_json: {
          message: "This is a friendly reminder about your upcoming service appointment. We look forward to serving you!",
          delay_days: 1
        }
      }
    ];

    const { data, error } = await supabase
      .from('automation_templates')
      .insert(defaultTemplates)
      .select();

    if (error) {
      console.error('[ZAPIER_INGEST] Error creating default templates:', error);
      return false;
    }

    console.log(`[ZAPIER_INGEST] Created ${data.length} default templates for business: ${businessId}`);
    return true;
  } catch (error) {
    console.error('[ZAPIER_INGEST] Error in provisionDefaultTemplates:', error);
    return false;
  }
}

// Upsert customer data
async function upsertCustomer(businessId, customerData) {
  try {
    console.log(`[ZAPIER_INGEST] Upserting customer for business: ${businessId}`, customerData);
    
    const { data, error } = await supabase
      .from('customers')
      .upsert({
        business_id: businessId,
        full_name: customerData.name || customerData.full_name,
        email: customerData.email,
        phone: customerData.phone,
        service_date: customerData.service_date,
        source: customerData.source || 'zapier',
        created_by: customerData.created_by,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'business_id,email',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('[ZAPIER_INGEST] Error upserting customer:', error);
      return null;
    }

    console.log(`[ZAPIER_INGEST] Successfully upserted customer:`, data[0]);
    return data[0];
  } catch (error) {
    console.error('[ZAPIER_INGEST] Error in upsertCustomer:', error);
    return null;
  }
}

// Enqueue sequence start for matching templates
async function enqueueSequenceStart(businessId, eventType, customerData) {
  try {
    console.log(`[ZAPIER_INGEST] Enqueuing sequence start for business: ${businessId}, event: ${eventType}`);
    
    // Map event types to template keys
    const eventToTemplateKey = {
      'job.completed': 'job_completed',
      'invoice.paid': 'invoice_paid',
      'appointment.scheduled': 'service_reminder'
    };

    const templateKey = eventToTemplateKey[eventType];
    if (!templateKey) {
      console.log(`[ZAPIER_INGEST] No template mapping for event type: ${eventType}`);
      return;
    }

    // Find active templates for this business and event type
    const { data: templates, error } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', businessId)
      .eq('key', templateKey)
      .eq('status', 'active');

    if (error) {
      console.error('[ZAPIER_INGEST] Error fetching templates:', error);
      return;
    }

    if (!templates || templates.length === 0) {
      console.log(`[ZAPIER_INGEST] No active templates found for business: ${businessId}, key: ${templateKey}`);
      return;
    }

    // For each matching template, create a sequence execution record
    for (const template of templates) {
      const sequenceData = {
        business_id: businessId,
        template_id: template.id,
        customer_id: customerData.id,
        event_type: eventType,
        status: 'pending',
        scheduled_for: new Date().toISOString(),
        payload: customerData,
        created_at: new Date().toISOString()
      };

      // Insert into automation_logs or a sequences_execution table
      const { error: logError } = await supabase
        .from('automation_logs')
        .insert({
          business_id: businessId,
          level: 'info',
          message: `Sequence queued for ${template.name} - ${eventType}`,
          metadata: sequenceData
        });

      if (logError) {
        console.error('[ZAPIER_INGEST] Error logging sequence execution:', logError);
      } else {
        console.log(`[ZAPIER_INGEST] Queued sequence execution for template: ${template.name}`);
      }
    }
  } catch (error) {
    console.error('[ZAPIER_INGEST] Error in enqueueSequenceStart:', error);
  }
}

// Update customer service date for appointment.scheduled
async function updateCustomerServiceDate(businessId, customerData) {
  try {
    console.log(`[ZAPIER_INGEST] Updating service date for customer:`, customerData);
    
    const { error } = await supabase
      .from('customers')
      .update({
        service_date: customerData.service_date,
        updated_at: new Date().toISOString()
      })
      .eq('business_id', businessId)
      .eq('email', customerData.email);

    if (error) {
      console.error('[ZAPIER_INGEST] Error updating service date:', error);
    } else {
      console.log(`[ZAPIER_INGEST] Updated service date for customer: ${customerData.email}`);
    }
  } catch (error) {
    console.error('[ZAPIER_INGEST] Error in updateCustomerServiceDate:', error);
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Zapier-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id, event_type, payload } = req.body;
    const signature = req.headers['x-zapier-signature'];

    // Validate required fields
    if (!business_id || !event_type || !payload) {
      console.error('[ZAPIER_INGEST] Missing required fields:', { business_id, event_type, payload: !!payload });
      return res.status(400).json({ error: 'Missing required fields: business_id, event_type, payload' });
    }

    // Validate event type
    const supportedEvents = ['customer.created', 'customer.updated', 'job.completed', 'invoice.paid', 'appointment.scheduled'];
    if (!supportedEvents.includes(event_type)) {
      console.error('[ZAPIER_INGEST] Unsupported event type:', event_type);
      return res.status(400).json({ error: `Unsupported event type. Supported: ${supportedEvents.join(', ')}` });
    }

    // Get business integration to validate HMAC
    const { data: integration, error: integrationError } = await supabase
      .from('business_integrations')
      .select('metadata_json')
      .eq('business_id', business_id)
      .eq('provider', 'zapier')
      .eq('status', 'active')
      .single();

    if (integrationError || !integration) {
      console.error('[ZAPIER_INGEST] No active Zapier integration found for business:', business_id);
      return res.status(400).json({ error: 'No active Zapier integration found for this business' });
    }

    // Validate HMAC if signature provided
    if (signature) {
      const secret = integration.metadata_json?.webhook_secret;
      if (!secret) {
        console.error('[ZAPIER_INGEST] No webhook secret found for business:', business_id);
        return res.status(400).json({ error: 'No webhook secret configured for this business' });
      }

      const payloadString = JSON.stringify(payload);
      if (!validateHMAC(payloadString, signature, secret)) {
        console.error('[ZAPIER_INGEST] HMAC validation failed for business:', business_id);
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    console.log(`[ZAPIER_INGEST] Processing event: ${event_type} for business: ${business_id}`);

    let customer = null;

    // Handle customer events
    if (event_type === 'customer.created' || event_type === 'customer.updated') {
      customer = await upsertCustomer(business_id, payload);
      
      if (customer) {
        // Check if automation templates exist for this business
        const { data: templates, error: templatesError } = await supabase
          .from('automation_templates')
          .select('id')
          .eq('business_id', business_id)
          .limit(1);

        if (templatesError) {
          console.error('[ZAPIER_INGEST] Error checking templates:', templatesError);
        } else if (!templates || templates.length === 0) {
          console.log(`[ZAPIER_INGEST] No templates found, provisioning defaults for business: ${business_id}`);
          await provisionDefaultTemplates(business_id);
        }
      }
    }

    // Handle job completion and invoice payment events
    if (event_type === 'job.completed' || event_type === 'invoice.paid') {
      // First ensure customer exists
      if (!customer) {
        customer = await upsertCustomer(business_id, payload);
      }
      
      if (customer) {
        await enqueueSequenceStart(business_id, event_type, customer);
      }
    }

    // Handle appointment scheduling
    if (event_type === 'appointment.scheduled') {
      // First ensure customer exists
      if (!customer) {
        customer = await upsertCustomer(business_id, payload);
      }
      
      if (customer) {
        // Update service date
        await updateCustomerServiceDate(business_id, payload);
        
        // Enqueue date-based reminders
        await enqueueSequenceStart(business_id, event_type, customer);
      }
    }

    // Always return 200 to prevent Zapier retries
    return res.status(200).json({ 
      success: true, 
      message: 'Event processed successfully',
      event_type,
      business_id
    });

  } catch (error) {
    console.error('[ZAPIER_INGEST] Unexpected error:', error);
    
    // Always return 200 to prevent Zapier retries
    return res.status(200).json({ 
      success: false, 
      message: 'Event processed with errors',
      error: error.message
    });
  }
}
