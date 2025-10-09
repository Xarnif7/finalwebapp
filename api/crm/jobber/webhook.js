import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Function to get raw body for HMAC verification
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(Buffer.from(data, 'utf8'));
    });
    req.on('error', reject);
  });
}

// Disable default body parser for raw access
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body for HMAC verification
    const rawBody = await getRawBody(req);
    const signature = req.headers['x-jobber-hmac-sha256'];
    const clientSecret = process.env.JOBBER_CLIENT_SECRET;
    
    if (!signature || !clientSecret) {
      console.error('Missing webhook signature or client secret');
      return res.status(401).json({ error: 'Missing authentication' });
    }

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', clientSecret)
      .update(rawBody)
      .digest('base64');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse the verified body
    const payload = JSON.parse(rawBody.toString());
    console.log('Jobber webhook received:', JSON.stringify(payload, null, 2));

    // Handle different event types
    const eventType = payload.event;
    
    if (eventType === 'job.closed' || eventType === 'job.completed') {
      await handleJobCompleted(payload);
    } else {
      console.log('Unhandled Jobber event type:', eventType);
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Jobber webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleJobCompleted(payload) {
  try {
    console.log('[JOBBER_WEBHOOK] Processing job completion event');
    
    const jobData = payload.data || payload.job || payload;
    
    if (!jobData || !jobData.id) {
      console.error('[JOBBER_WEBHOOK] Invalid job data in webhook payload');
      return;
    }

    // Extract business info from webhook payload or lookup
    let businessId = payload.business_id || payload.businessId;
    
    if (!businessId) {
      // Get first connected Jobber business (for single-tenant setups)
      const { data: integration } = await supabase
        .from('integrations_jobber')
        .select('business_id')
        .eq('connection_status', 'connected')
        .limit(1)
        .maybeSingle();
      
      businessId = integration?.business_id;
    }

    if (!businessId) {
      console.error('[JOBBER_WEBHOOK] Could not determine business_id');
      return;
    }

    console.log('[JOBBER_WEBHOOK] Processing for business:', businessId);

    // Get Jobber integration for this business
    const { data: integration, error: integrationError } = await supabase
      .from('integrations_jobber')
      .select('*')
      .eq('business_id', businessId)
      .eq('connection_status', 'connected')
      .maybeSingle();

    if (integrationError || !integration) {
      console.error('[JOBBER_WEBHOOK] No active Jobber integration found');
      return;
    }

    // Update last webhook time
    await supabase
      .from('integrations_jobber')
      .update({ 
        last_webhook_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', integration.id);

    // Fetch full job details from Jobber API
    console.log('[JOBBER_WEBHOOK] Fetching job details for job:', jobData.id);
    const jobDetails = await fetchJobDetailsFromJobber(integration.access_token, jobData.id);
    
    if (!jobDetails) {
      console.error('[JOBBER_WEBHOOK] Failed to fetch job details');
      return;
    }

    // Extract customer information
    const customerInfo = await extractCustomerInfo(integration.access_token, jobDetails);
    if (!customerInfo || (!customerInfo.email && !customerInfo.phone)) {
      console.error('[JOBBER_WEBHOOK] No customer contact info available');
      return;
    }

    console.log('[JOBBER_WEBHOOK] Customer:', customerInfo.name, customerInfo.email);

    // Upsert customer to our database
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .upsert({
        business_id: businessId,
        full_name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address,
        status: 'active',
        created_by: (await supabase.from('businesses').select('created_by').eq('id', businessId).single()).data.created_by,
        external_id: jobDetails.client_id || customerInfo.id,
        source: 'jobber',
        last_synced_at: new Date().toISOString()
      }, {
        onConflict: 'business_id,email'
      })
      .select()
      .single();

    if (customerError) {
      console.error('[JOBBER_WEBHOOK] Failed to upsert customer:', customerError);
      return;
    }

    console.log('✅ [JOBBER_WEBHOOK] Customer synced:', customer.id);

    // TRIGGER JOURNEYS - Match sequences with trigger_event_type = 'job_completed'
    console.log('[JOBBER_WEBHOOK] Finding matching journeys for job_completed trigger...');
    
    const { data: matchingSequences, error: sequencesError } = await supabase
      .from('sequences')
      .select('id, name')
      .eq('business_id', businessId)
      .eq('trigger_event_type', 'job_completed')
      .eq('status', 'active');

    if (sequencesError) {
      console.error('[JOBBER_WEBHOOK] Error fetching sequences:', sequencesError);
      return;
    }

    if (!matchingSequences || matchingSequences.length === 0) {
      console.log('[JOBBER_WEBHOOK] No active journeys found for job_completed trigger');
      return;
    }

    console.log(`[JOBBER_WEBHOOK] Found ${matchingSequences.length} matching journeys`);

    // Enroll customer in each matching journey
    for (const sequence of matchingSequences) {
      try {
        // Get first step to determine timing
        const { data: firstStep } = await supabase
          .from('sequence_steps')
          .select('step_index, wait_ms')
          .eq('sequence_id', sequence.id)
          .order('step_index', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!firstStep) {
          console.log('[JOBBER_WEBHOOK] No steps found for journey:', sequence.name);
          continue;
        }

        // Check if already enrolled
        const { data: existing } = await supabase
          .from('sequence_enrollments')
          .select('id')
          .eq('sequence_id', sequence.id)
          .eq('customer_id', customer.id)
          .eq('status', 'active')
          .maybeSingle();

        if (existing) {
          console.log('[JOBBER_WEBHOOK] Customer already enrolled in:', sequence.name);
          continue;
        }

        // Enroll customer
        const nextRunAt = new Date(Date.now() + (firstStep.wait_ms || 0));

        const { data: enrollment, error: enrollError } = await supabase
          .from('sequence_enrollments')
          .insert({
            business_id: businessId,
            sequence_id: sequence.id,
            customer_id: customer.id,
            status: 'active',
            current_step_index: firstStep.step_index,
            next_run_at: nextRunAt.toISOString(),
            last_event_at: new Date().toISOString(),
            meta: {
              trigger_source: 'jobber_webhook',
              trigger_event: 'job_completed',
              jobber_job_id: jobData.id,
              enrolled_at: new Date().toISOString()
            }
          })
          .select()
          .single();

        if (enrollError) {
          console.error('[JOBBER_WEBHOOK] Failed to enroll in journey:', enrollError);
        } else {
          console.log(`✅ [JOBBER_WEBHOOK] Enrolled in journey "${sequence.name}" - ID: ${enrollment.id}`);
        }

      } catch (error) {
        console.error(`[JOBBER_WEBHOOK] Error enrolling in sequence ${sequence.name}:`, error);
      }
    }

    console.log('✅ [JOBBER_WEBHOOK] Job completion processed successfully');

  } catch (error) {
    console.error('[JOBBER_WEBHOOK] Error handling job completion:', error);
  }
}

async function getBusinessIdFromJobberJob(jobId) {
  // This is a simplified approach - in a real implementation,
  // you might need to store job-to-business mappings
  // For now, we'll get it from the first connected business
  const { data: connections } = await supabase
    .from('crm_connections')
    .select('business_id')
    .eq('crm_type', 'jobber')
    .eq('status', 'connected')
    .limit(1);

  return connections?.[0]?.business_id;
}

async function fetchJobDetailsFromJobber(accessToken, jobId) {
  try {
    const response = await fetch('https://api.getjobber.com/api/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
          query GetJob($id: ID!) {
            job(id: $id) {
              id
              title
              jobNumber
              client {
                id
                name
                emails {
                  address
                  primary
                }
                phones {
                  number
                  primary
                }
                property {
                  address {
                    street1
                    city
                    province
                    postalCode
                  }
                }
              }
              lineItems {
                nodes {
                  name
                  description
                }
              }
            }
          }
        `,
        variables: { id: jobId }
      })
    });

    if (!response.ok) {
      console.error('[JOBBER_WEBHOOK] Failed to fetch job details:', response.status);
      return null;
    }

    const data = await response.json();
    return data?.data?.job;
    
  } catch (error) {
    console.error('[JOBBER_WEBHOOK] Error fetching job details:', error);
    return null;
  }
}

async function extractCustomerInfo(accessToken, jobDetails) {
  try {
    if (!jobDetails || !jobDetails.client) {
      return null;
    }

    const client = jobDetails.client;
    const primaryEmail = client.emails?.find(e => e.primary)?.address || client.emails?.[0]?.address;
    const primaryPhone = client.phones?.find(p => p.primary)?.number || client.phones?.[0]?.number;

    const address = client.property?.address;
    const fullAddress = address 
      ? [address.street1, address.city, address.province, address.postalCode].filter(Boolean).join(', ')
      : null;

    return {
      id: client.id,
      name: client.name,
      email: primaryEmail,
      phone: primaryPhone,
      address: fullAddress
    };
    
  } catch (error) {
    console.error('[JOBBER_WEBHOOK] Error extracting customer info:', error);
    return null;
  }
}

async function findMatchingTemplate(businessId, serviceType) {
  try {
    // Use the database function to find the best matching template
    const { data, error } = await supabase
      .rpc('find_template_for_service_type', {
        p_business_id: businessId,
        p_service_type: serviceType,
        p_trigger_event: 'jobber_job_completed'
      });

    if (error) {
      console.error('Error finding matching template:', error);
      return await getDefaultTemplate(businessId);
    }

    if (data && data.length > 0) {
      const templateData = data[0];
      
      // Get the full template record
      const { data: fullTemplate, error: templateError } = await supabase
        .from('automation_templates')
        .select('*')
        .eq('id', templateData.template_id)
        .single();

      if (templateError) {
        console.error('Error fetching full template:', templateError);
        return await getDefaultTemplate(businessId);
      }

      return fullTemplate;
    }

    // No matching template found, try default
    return await getDefaultTemplate(businessId);

  } catch (error) {
    console.error('Error in findMatchingTemplate:', error);
    return await getDefaultTemplate(businessId);
  }
}

async function getDefaultTemplate(businessId) {
  // Look for default template or any active template as fallback
  const { data: defaultTemplate } = await supabase
    .from('automation_templates')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .eq('is_default', true)
    .limit(1);

  if (defaultTemplate && defaultTemplate.length > 0) {
    return defaultTemplate[0];
  }

  // Fallback to any active template
  const { data: anyTemplate } = await supabase
    .from('automation_templates')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .limit(1);

  return anyTemplate?.[0];
}

async function triggerJobberAutomation({ businessId, template, customerInfo, jobDetails, serviceType }) {
  try {
    // Create a review request entry
    const { data: reviewRequest, error: reviewError } = await supabase
      .from('review_requests')
      .insert({
        business_id: businessId,
        customer_id: null, // We'll create/update customer record
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        message: template.custom_message || template.message || 'Thank you for your business! Please consider leaving us a review.',
        review_link: `https://www.google.com/search?q=${encodeURIComponent(template.business_name || 'our business')}`,
        channel: 'email',
        status: 'pending',
        send_at: new Date(Date.now() + (template.config_json?.delay_hours || 24) * 60 * 60 * 1000).toISOString(),
        created_by: businessId, // Using business_id as created_by for now
        metadata: {
          jobber_job_id: jobDetails.id,
          service_type: serviceType,
          jobber_customer_id: jobDetails.customer_id,
          triggered_by: 'jobber_webhook'
        }
      })
      .select()
      .single();

    if (reviewError) {
      console.error('Failed to create review request:', reviewError);
      return;
    }

    // Create or update customer record
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .upsert({
        business_id: businessId,
        full_name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address,
        status: 'active',
        created_by: businessId,
        metadata: {
          jobber_customer_id: jobDetails.customer_id,
          source: 'jobber_integration'
        }
      }, {
        onConflict: 'business_id,email'
      })
      .select()
      .single();

    if (customerError) {
      console.error('Failed to create/update customer:', customerError);
    }

    // Update review request with customer ID
    if (customer && reviewRequest) {
      await supabase
        .from('review_requests')
        .update({ customer_id: customer.id })
        .eq('id', reviewRequest.id);
    }

    console.log('Successfully triggered automation for Jobber job:', jobDetails.id);

  } catch (error) {
    console.error('Error triggering Jobber automation:', error);
  }
}
