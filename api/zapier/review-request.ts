import { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, unauthorized, send, readJson } from '../_lib/http';

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
    event_ts 
  } = data;

  // At least one of email or phone must be present
  if (!email && !phone) {
    return send(res, 400, { ok: false, error: 'email_or_phone_required' });
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
    event_ts
  });

  // Return success response
  return send(res, 200, {
    ok: true,
    id: 'req_' + Date.now().toString(),
    message: 'Review request enqueued (stub)'
  });
}
