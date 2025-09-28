export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    success: true,
    message: 'QuickBooks webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    url: '/api/qbo/webhook',
    method: 'POST'
  });
}
