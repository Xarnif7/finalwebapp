export function readJson(req) {
  try {
    if (req.body) {
      return { data: req.body, error: null };
    }
    return { data: null, error: "No JSON body provided" };
  } catch (e) {
    return { data: null, error: `Invalid JSON: ${e.message}` };
  }
}

export function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).send(JSON.stringify(body));
}

export function methodNotAllowed(res) {
  send(res, 405, { ok: false, error: "Method not allowed" });
}

export function unauthorized(res) {
  send(res, 401, { ok: false, error: "unauthorized" });
}

export function requireZapierToken(req) {
  const zapierToken = req.headers['x-zapier-token'] || req.headers['X-Zapier-Token'];
  return zapierToken === process.env.ZAPIER_TOKEN;
}
