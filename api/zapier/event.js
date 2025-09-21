import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.status(405).send(JSON.stringify({ ok: false, error: "Method not allowed" }));
    return;
  }

  // Check Zapier token
  const token = req.headers['x-zapier-token'] || req.headers['X-Zapier-Token'];
  if (!token || token !== process.env.ZAPIER_TOKEN) {
    res.setHeader('Content-Type', 'application/json');
    res.status(401).send(JSON.stringify({ ok: false, error: "unauthorized" }));
    return;
  }

  // Parse JSON body
  let data;
  try {
    data = req.body;
    if (!data) {
      res.setHeader('Content-Type', 'application/json');
      res.status(400).send(JSON.stringify({ ok: false, error: "No JSON body provided" }));
      return;
    }
  } catch (e) {
    res.setHeader('Content-Type', 'application/json');
    res.status(400).send(JSON.stringify({ ok: false, error: `Invalid JSON: ${e.message}` }));
    return;
  }

  // Validate required fields
  const { 
    event_type, 
    email, 
    external_id, 
    service_date,
    payload,
    business_id
  } = data;

  // Validate required fields
  if (!event_type || (!email && !external_id)) {
    res.setHeader('Content-Type', 'application/json');
    res.status(400).send(JSON.stringify({ 
      ok: false, 
      error: 'Missing required fields: event_type, email or external_id' 
    }));
    return;
  }

  // Validate event type
  const supportedEvents = ['job_completed', 'invoice_paid', 'service_scheduled'];
  if (!supportedEvents.includes(event_type)) {
    res.setHeader('Content-Type', 'application/json');
    res.status(400).send(JSON.stringify({ 
      ok: false, 
      error: `Unsupported event type. Supported: ${supportedEvents.join(', ')}` 
    }));
    return;
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve business_id from payload or fallback
    let resolvedBusinessId;
    
    if (business_id) {
      resolvedBusinessId = business_id;
    } else {
      // Fallback: use Demo Business
      let { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('name', 'Demo Business')
        .single();

      if (businessError && businessError.code !== 'PGRST116') {
        console.error('Error fetching Demo Business:', businessError);
        throw new Error('Failed to fetch business');
      }

      if (!business) {
        // Create Demo Business
        const { data: newBusiness, error: insertError } = await supabase
          .from('businesses')
          .insert({ 
            name: 'Demo Business',
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error creating Demo Business:', insertError);
          throw new Error('Failed to create business');
        }
        business = newBusiness;
      }
      resolvedBusinessId = business.id;
    }

    // Log the payload
    console.log('[zapier:event]', {
      event_type,
      email,
      external_id,
      service_date,
      business_id: resolvedBusinessId
    });

    // Find customer by email or external_id
    let customer;
    if (email) {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, full_name, email, phone')
        .eq('business_id', resolvedBusinessId)
        .eq('email', email)
        .single();
      
      if (!customerError && customerData) {
        customer = customerData;
      }
    }

    if (!customer && external_id) {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, full_name, email, phone')
        .eq('business_id', resolvedBusinessId)
        .eq('external_id', external_id)
        .single();
      
      if (!customerError && customerData) {
        customer = customerData;
      }
    }

    if (!customer) {
      res.setHeader('Content-Type', 'application/json');
      res.status(404).send(JSON.stringify({ 
        ok: false, 
        error: 'Customer not found. Please upsert customer first.' 
      }));
      return;
    }

    // Create automation log entry
    const logData = {
      business_id: resolvedBusinessId,
      level: 'info',
      message: `Event triggered: ${event_type}`,
      metadata: {
        event_type,
        customer_id: customer.id,
        customer_email: customer.email,
        external_id,
        service_date,
        payload: payload || {}
      },
      created_at: new Date().toISOString()
    };

    const { data: logEntry, error: logError } = await supabase
      .from('automation_logs')
      .insert(logData)
      .select('id')
      .single();

    if (logError) {
      console.error('[zapier:event] Error creating log entry:', logError);
      // Don't fail the request, just log the error
    }

    // Create a sequence enrollment record
    const enrollmentData = {
      business_id: resolvedBusinessId,
      customer_id: customer.id,
      event_type,
      status: 'pending',
      scheduled_for: new Date().toISOString(),
      payload: payload || {},
      created_at: new Date().toISOString()
    };

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('automation_enrollments')
      .insert(enrollmentData)
      .select('id')
      .single();

    if (enrollmentError) {
      console.error('[zapier:event] Error creating enrollment:', enrollmentError);
      // Don't fail the request, just log the error
    }

    // Return success response
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({
      ok: true,
      enrollment_id: enrollment?.id || 'log_' + logEntry?.id,
      customer_id: customer.id,
      event_type,
      business_id: resolvedBusinessId,
      message: 'Event processed, sequence enrollment created'
    }));

  } catch (error) {
    console.error('[zapier:event] Unexpected error:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).send(JSON.stringify({ 
      ok: false, 
      error: 'Internal server error',
      details: error.message 
    }));
  }
}
