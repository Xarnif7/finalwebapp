import { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, unauthorized, send } from '../_lib/http';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return methodNotAllowed(res);
  }

  // Check X-Zapier-Token header
  const token = req.headers['x-zapier-token'] || req.headers['X-Zapier-Token'];
  
  if (!token || token !== process.env.ZAPIER_TOKEN) {
    return unauthorized(res);
  }

  // Success - return 200 with ok: true
  return send(res, 200, { ok: true });
}
