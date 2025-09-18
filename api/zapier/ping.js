import { send, methodNotAllowed, unauthorized, requireZapierToken } from '../_lib/http.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res);
  }

  if (!requireZapierToken(req)) {
    return unauthorized(res);
  }

  send(res, 200, { ok: true });
}
