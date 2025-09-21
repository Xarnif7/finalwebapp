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
    tags,
    source,
    event_ts,
    business_id
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
    console.log('[zapier:upsert-customer]', {
      external_id,
      email,
      phone,
      first_name,
      last_name,
      business_id: resolvedBusinessId
    });

    // Prepare customer data
    const customerData = {
      business_id: resolvedBusinessId,
      full_name: `${first_name || ''} ${last_name || ''}`.trim() || 'Unknown Customer',
      email: email || null,
      phone: phone || null,
      external_id: external_id || null,
      source: source || 'zapier',
      tags: tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Upsert customer (insert or update)
    const { data: customer, error: upsertError } = await supabase
      .from('customers')
      .upsert(customerData, {
        onConflict: 'business_id,email',
        ignoreDuplicates: false
      })
      .select('id, full_name, email, phone')
      .single();

    if (upsertError) {
      console.error('[zapier:upsert-customer] Upsert error:', upsertError);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({ 
        ok: false, 
        error: 'Failed to upsert customer',
        details: upsertError.message 
      }));
      return;
    }

    // Return success response
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({
      ok: true,
      customer_id: customer.id,
      customer: {
        id: customer.id,
        full_name: customer.full_name,
        email: customer.email,
        phone: customer.phone
      },
      business_id: resolvedBusinessId,
      message: 'Customer upserted successfully'
    }));

  } catch (error) {
    console.error('[zapier:upsert-customer] Unexpected error:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).send(JSON.stringify({ 
      ok: false, 
      error: 'Internal server error',
      details: error.message 
    }));
  }
}
