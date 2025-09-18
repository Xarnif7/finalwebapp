export default function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      ok: false, 
      error: 'Method not allowed' 
    });
  }

  // Read the X-Zapier-Token header
  const zapierToken = req.headers['x-zapier-token'];

  // Check if token is missing or doesn't match
  if (!zapierToken || zapierToken !== process.env.ZAPIER_TOKEN) {
    return res.status(401).json({ 
      ok: false, 
      error: 'unauthorized' 
    });
  }

  // Token matches - return success
  return res.status(200).json({ 
    ok: true 
  });
}
