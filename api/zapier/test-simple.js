export default async function handler(req, res) {
  console.log('[test-simple] Request received:', {
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body
  });

  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({
    ok: true,
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    method: req.method,
    hasBody: !!req.body,
    queryParams: Object.keys(req.query || {})
  }));
}
