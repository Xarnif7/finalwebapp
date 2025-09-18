import { methodNotAllowed, unauthorized, send, readJson } from '../_lib/http.js';
import { getAdminClient, getOrCreateBusinessByName, createAuditLog } from '../_lib/supabase.js';
import { generatePayloadHash } from '../_lib/tenancy.js';

export default async function handler(req, res) {
  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  // Check Zapier token
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
    return send(res, 400, { ok: false, error: 'email_or_phone_required' });
  }

  try {
    // Initialize Supabase client
    const supabase = getAdminClient();

    // Resolve business_id from payload or fallback
    let resolvedBusinessId;
    
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

    // TODO: Implement actual review request creation
    // For now, just create a placeholder message record
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
        return send(res, 500, { ok: false, error: 'Failed to create review request' });
    }

    // Create audit log entry
    const payloadHash = generatePayloadHash(data);
    await createAuditLog(resolvedBusinessId, 'zapier', 'review-request', payloadHash);

    // Return success response
    return send(res, 200, {
      ok: true,
      id: newMessage.id,
      business_id: resolvedBusinessId,
      message: 'Review request enqueued'
    });

  } catch (error) {
    console.error('[zapier:review-request] Unexpected error:', error);
    return send(res, 500, { ok: false, error: 'Internal server error' });
  }
}
