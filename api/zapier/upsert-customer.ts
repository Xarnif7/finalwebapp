import { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, unauthorized, send, readJson } from '../_lib/http';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  // Check X-Zapier-Token header
  const token = req.headers['x-zapier-token'] || req.headers['X-Zapier-Token'];
  
  if (!token || token !== process.env.ZAPIER_TOKEN) {
    return unauthorized(res);
  }

  // Parse JSON body
  const { data, error } = await readJson(req);
  
  if (error) {
    return send(res, 400, { ok: false, error });
  }

  // Validate required fields
  const { external_id, first_name, last_name, email, phone, tags, source, event_ts } = data;

  // At least one of email or phone must be present
  if (!email && !phone) {
    return send(res, 400, { ok: false, error: 'email_or_phone_required' });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[zapier:upsert-customer] Missing Supabase credentials');
      return send(res, 500, { ok: false, error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Prepare customer data
    const customerData = {
      external_id,
      business_id: 'demo_business_id', // Placeholder until business_id is provided by Zapier
      first_name,
      last_name,
      email,
      phone,
      tags: tags || [],
      source: source || 'zapier',
      event_ts: event_ts || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Check if customer with this external_id already exists
    const { data: existingCustomer, error: selectError } = await supabase
      .from('customers')
      .select('id')
      .eq('external_id', external_id)
      .single();

    let result;
    if (existingCustomer) {
      // Update existing customer
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update(customerData)
        .eq('external_id', external_id)
        .select('id')
        .single();

      if (updateError) {
        console.error('[zapier:upsert-customer] Update error:', updateError);
        return send(res, 500, { ok: false, error: 'Failed to update customer' });
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
        return send(res, 500, { ok: false, error: 'Failed to create customer' });
      }

      result = newCustomer;
      console.log('[zapier:upsert-customer] Created customer:', newCustomer.id);
    }

    // Return success response
    return send(res, 200, {
      ok: true,
      id: result.id,
      message: 'Customer upserted'
    });

  } catch (error) {
    console.error('[zapier:upsert-customer] Unexpected error:', error);
    return send(res, 500, { ok: false, error: 'Internal server error' });
  }
}
