export default function handler(req, res) {
  // Only allow GET requests for debugging
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.status(405).send(JSON.stringify({ ok: false, error: "Method not allowed" }));
    return;
  }

  // Check environment variables
  const envCheck = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    ZAPIER_TOKEN: process.env.ZAPIER_TOKEN ? 'SET' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV || 'undefined'
  };

  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({
    ok: true,
    environment: envCheck,
    message: 'Environment variables check'
  }));
}
