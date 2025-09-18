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
    external_id, 
    email, 
    phone, 
    first_name, 
    last_name, 
    job_id, 
    job_type, 
    invoice_id, 
    invoice_total, 
    event_ts,
    business_id,
    external_business_key
  } = data;

  // At least one of email or phone must be present
  if (!email && !phone) {
    res.setHeader('Content-Type', 'application/json');
    res.status(400).send(JSON.stringify({ ok: false, error: 'email_or_phone_required' }));
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
    console.log('[zapier:review-request]', {
      external_id,
      email,
      phone,
      first_name,
      last_name,
      job_id,
      job_type,
      invoice_id,
      invoice_total,
      event_ts,
      business_id: resolvedBusinessId
    });

    // Create a placeholder message record
    const messageData = {
      business_id: resolvedBusinessId,
      customer_email: email,
      customer_phone: phone,
      customer_name: `${first_name} ${last_name}`.trim(),
      subject: `Review Request - ${job_type || 'Service'}`,
      content: `Review request for ${job_type || 'service'} - Job ID: ${job_id || 'N/A'}`,
      type: 'review_request',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newMessage, error: insertError } = await supabase
      .from('messages')
      .insert(messageData)
      .select('id')
      .single();

    if (insertError) {
        console.error('[zapier:review-request] Insert error:', insertError);
        res.setHeader('Content-Type', 'application/json');
        res.status(500).send(JSON.stringify({ ok: false, error: 'Failed to create review request' }));
        return;
    }

    // Return success response
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({
      ok: true,
      id: newMessage.id,
      business_id: resolvedBusinessId,
      message: 'Review request enqueued'
    }));

  } catch (error) {
    console.error('[zapier:review-request] Unexpected error:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).send(JSON.stringify({ ok: false, error: 'Internal server error' }));
  }
}