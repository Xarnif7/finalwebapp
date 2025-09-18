import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.status(405).send(JSON.stringify({ ok: false, error: "Method not allowed" }));
    return;
  }

  // Check X-Zapier-Token header
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
  const { external_id, first_name, last_name, email, phone, tags, source, event_ts, business_id, external_business_key } = data;

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

    // Prepare customer data
    const customerData = {
      external_id,
      business_id: resolvedBusinessId,
      first_name,
      last_name,
      email,
      phone,
      tags: tags || [],
      source: source || 'zapier',
      event_ts: event_ts || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Check if customer with this external_id already exists within the same business
    const { data: existingCustomer, error: selectError } = await supabase
      .from('customers')
      .select('id')
      .eq('external_id', external_id)
      .eq('business_id', resolvedBusinessId)
      .single();

    let result;
    if (existingCustomer) {
      // Update existing customer
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update(customerData)
        .eq('external_id', external_id)
        .eq('business_id', resolvedBusinessId)
        .select('id')
        .single();

      if (updateError) {
        console.error('[zapier:upsert-customer] Update error:', updateError);
        res.setHeader('Content-Type', 'application/json');
        res.status(500).send(JSON.stringify({ ok: false, error: 'Failed to update customer' }));
        return;
      }

      result = updatedCustomer;
      console.log('[zapier:upsert-customer] Updated customer:', updatedCustomer.id);
    } else {
      // Insert new customer
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          ...customerData,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[zapier:upsert-customer] Insert error:', insertError);
        res.setHeader('Content-Type', 'application/json');
        res.status(500).send(JSON.stringify({ ok: false, error: 'Failed to create customer' }));
        return;
      }

      result = newCustomer;
      console.log('[zapier:upsert-customer] Created customer:', newCustomer.id);
    }

    // Return success response
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({
      ok: true,
      id: result.id,
      business_id: resolvedBusinessId,
      message: 'Customer upserted'
    }));

  } catch (error) {
    console.error('[zapier:upsert-customer] Unexpected error:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).send(JSON.stringify({ ok: false, error: 'Internal server error' }));
  }
}