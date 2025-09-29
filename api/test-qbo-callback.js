export default async function handler(req, res) {
  console.log('[TEST] QBO Callback test endpoint hit');
  console.log('[TEST] Method:', req.method);
  console.log('[TEST] Query:', req.query);
  console.log('[TEST] Headers:', req.headers);
  
  return res.status(200).json({
    success: true,
    message: 'QBO Callback test endpoint is working',
    method: req.method,
    query: req.query,
    timestamp: new Date().toISOString()
  });
}
