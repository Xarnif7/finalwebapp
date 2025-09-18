import { NextApiRequest, NextApiResponse } from 'next';

export interface JsonResult {
  data?: any;
  error?: string;
}

/**
 * Safely parse JSON body from request
 */
export async function readJson(req: NextApiRequest): Promise<JsonResult> {
  try {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    return new Promise((resolve) => {
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({ data });
        } catch (error) {
          resolve({ error: 'invalid_json' });
        }
      });
    });
  } catch (error) {
    return { error: 'invalid_json' };
  }
}

/**
 * Send JSON response with correct status and Content-Type
 */
export function send(res: NextApiResponse, status: number, body: any): void {
  res.status(status).json(body);
}

/**
 * Send 405 Method Not Allowed response
 */
export function methodNotAllowed(res: NextApiResponse): void {
  send(res, 405, { ok: false, error: 'Method not allowed' });
}

/**
 * Send 401 Unauthorized response
 */
export function unauthorized(res: NextApiResponse): void {
  send(res, 401, { ok: false, error: 'unauthorized' });
}

/**
 * Check if X-Zapier-Token header matches environment variable
 */
export function requireZapierToken(req: NextApiRequest): boolean {
  const token = req.headers['x-zapier-token'] || req.headers['X-Zapier-Token'];
  return token === process.env.ZAPIER_TOKEN;
}
