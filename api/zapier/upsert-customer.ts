import { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, unauthorized, send, readJson } from '../_lib/http';
import { getAdminClient, getUserBusinessId, getOrCreateBusinessByName, createAuditLog } from '../_lib/supabase';
import { generatePayloadHash } from '../_lib/tenancy';

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
  const { external_id, first_name, last_name, email, phone, tags, source, event_ts, business_id, external_business_key } = data;

  // At least one of email or phone must be present
  if (!email && !phone) {
    return send(res, 400, { ok: false, error: 'email_or_phone_required' });
  }

  try {
    // Initialize Supabase client
    const supabase = getAdminClient();

    // Resolve business_id from payload or fallback
    let resolvedBusinessId: string;
    
    if (business_id) {
      resolvedBusinessId = business_id;
    } else if (external_business_key) {
      // TODO: Implement external business key lookup
      // For now, treat as business name
      resolvedBusinessId = await getOrCreateBusinessByName(external_business_key);
    } else {
      // Fallback: use Demo Business
      resolvedBusinessId = await getOrCreateBusinessByName('Demo Business');
    }

    // Prepare customer data
    const customerData = {
      external_id,
      business_id: resolvedBusinessId, // Use resolved business_id
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

    // Create audit log entry
    const payloadHash = generatePayloadHash(data);
    await createAuditLog(resolvedBusinessId, 'zapier', 'upsert-customer', payloadHash);

    // Return success response
    return send(res, 200, {
      ok: true,
      id: result.id,
      business_id: resolvedBusinessId,
      message: 'Customer upserted'
    });

  } catch (error) {
    console.error('[zapier:upsert-customer] Unexpected error:', error);
    return send(res, 500, { ok: false, error: 'Internal server error' });
  }
}
