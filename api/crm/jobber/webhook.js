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
    const jobData = payload.job;
    
    if (!jobData || !jobData.id) {
      console.error('Invalid job data in webhook payload');
      return;
    }

    // Get the business connection
    const businessId = await getBusinessIdFromJobberJob(jobData.id);
    if (!businessId) {
      console.error('Could not determine business ID for job:', jobData.id);
      return;
    }

    // Get the connection details
    const { data: connection, error: connectionError } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('business_id', businessId)
      .eq('crm_type', 'jobber')
      .eq('status', 'connected')
      .single();

    if (connectionError || !connection) {
      console.error('No active Jobber connection found for business:', businessId);
      return;
    }

    // Fetch full job details from Jobber API
    const jobDetails = await fetchJobDetailsFromJobber(connection.access_token, jobData.id);
    if (!jobDetails) {
      console.error('Failed to fetch job details from Jobber');
      return;
    }

    // Extract customer information
    const customerInfo = await extractCustomerInfo(connection.access_token, jobDetails);
    if (!customerInfo) {
      console.error('Failed to extract customer information');
      return;
    }

    // Determine service type and find matching template
    const serviceType = jobDetails.service_type || jobDetails.category || 'General Service';
    const template = await findMatchingTemplate(businessId, serviceType);
    
    if (!template) {
      console.log('No matching template found for service type:', serviceType);
      return;
    }

    // Trigger the automation
    await triggerJobberAutomation({
      businessId,
      template,
      customerInfo,
      jobDetails,
      serviceType
    });

    console.log('Successfully processed Jobber job completion:', jobData.id);

  } catch (error) {
    console.error('Error handling job completion:', error);
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
    const response = await fetch(`https://api.getjobber.com/api/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch job details:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching job details:', error);
    return null;
  }
}

async function extractCustomerInfo(accessToken, jobDetails) {
  try {
    const customerId = jobDetails.customer_id;
    if (!customerId) {
      return null;
    }

    const response = await fetch(`https://api.getjobber.com/api/customers/${customerId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch customer details:', response.status);
      return null;
    }

    const customerData = await response.json();
    
    return {
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      address: customerData.address
    };
  } catch (error) {
    console.error('Error extracting customer info:', error);
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
