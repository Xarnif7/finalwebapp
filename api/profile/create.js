import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Set CORS headers
function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin.includes('localhost:5173')
    ? 'http://localhost:5173'
    : 'https://myblipp.com';
  
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Content-Type', 'application/json');
}

export default async function handler(req, res) {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      setCorsHeaders(req, res);
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      setCorsHeaders(req, res);
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    // Get user from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[PROFILE_CREATE] No authorization header');
      setCorsHeaders(req, res);
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'auth_required' }));
      return;
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[PROFILE_CREATE] Auth error:', authError);
      setCorsHeaders(req, res);
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'auth_required' }));
      return;
    }

    const { business_id } = req.body;
    
    if (!business_id) {
      setCorsHeaders(req, res);
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'business_id is required' }));
      return;
    }

    console.log('[PROFILE_CREATE] Creating profile for user:', user.id, 'business:', business_id);

    // Create profile using service role (bypasses RLS)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        business_id: business_id,
        role: 'owner'
      })
      .select('id, business_id, role')
      .single();

    if (profileError) {
      console.error('[PROFILE_CREATE] Error creating profile:', profileError);
      setCorsHeaders(req, res);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Failed to create profile', details: profileError }));
      return;
    }

    console.log('[PROFILE_CREATE] Successfully created profile:', profile);

    setCorsHeaders(req, res);
    res.statusCode = 200;
    res.end(JSON.stringify({ 
      success: true, 
      profile: profile 
    }));

  } catch (error) {
    console.error('[PROFILE_CREATE] Error:', error);
    setCorsHeaders(req, res);
    res.statusCode = 500;
    res.end(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }));
  }
}
