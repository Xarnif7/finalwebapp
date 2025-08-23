import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Set CORS headers based on request origin
function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin.includes('localhost:5173')
    ? 'http://localhost:5173'
    : 'https://myblipp.com';
  
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
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

    // Add health check endpoint
    if (req.method === 'GET' && req.url.includes('?health=1')) {
      setCorsHeaders(req, res);
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: {
          hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      }));
      return;
    }

    if (req.method !== 'GET') {
      setCorsHeaders(req, res);
      res.statusCode = 405;
      res.end(JSON.stringify({ 
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      }));
      return;
    }

    // Get user from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[SUBSCRIPTION_STATUS] No authorization header');
      setCorsHeaders(req, res);
      res.statusCode = 401;
      res.end(JSON.stringify({ 
        error: 'auth_required',
        code: 'NO_AUTH_HEADER'
      }));
      return;
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[SUBSCRIPTION_STATUS] Auth error:', authError);
      setCorsHeaders(req, res);
      res.statusCode = 401;
      res.end(JSON.stringify({ 
        error: 'auth_required',
        code: 'INVALID_TOKEN'
      }));
      return;
    }

    console.log('[SUBSCRIPTION_STATUS] User identified:', user.id, 'at', new Date().toISOString());

    // Check for temporary subscription grant cookie (user-scoped)
    const cookies = req.headers.cookie || '';
    const cookieMatch = cookies.match(/sub_granted_uid=([^;]+)/);
    const grantedUserId = cookieMatch ? cookieMatch[1] : null;
    const granted = grantedUserId === user.id;
    
    // Clear any legacy cookie if present
    if (cookies.includes('sub_granted=')) {
      res.setHeader('Set-Cookie', 'sub_granted=; Max-Age=0; Path=/; SameSite=Lax; Secure');
    }
    
    console.log('[SUBSCRIPTION_STATUS] Cookie check:', { granted, grantedUserId, currentUserId: user.id, cookies: cookies.substring(0, 50) + '...' });

    // Query for active or trialing subscription - optimized query
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('status, plan_tier')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('[SUBSCRIPTION_STATUS] Database error:', error);
      setCorsHeaders(req, res);
      res.statusCode = 500;
      res.end(JSON.stringify({ 
        error: 'Database error',
        code: 'DB_ERROR',
        details: error.message
      }));
      return;
    }

    // Get onboarding completion status - optimized query
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[SUBSCRIPTION_STATUS] Profile error:', profileError);
    }

    // Determine if user is active (including temporary grant)
    const isActive = subscription || granted;
    const status = subscription ? subscription.status : (granted ? 'trialing' : 'none');
    const planTier = subscription ? subscription.plan_tier : (granted ? 'basic' : null);

    const result = {
      active: isActive,
      status: status,
      plan_tier: planTier,
      onboarding_completed: profile?.onboarding_completed || false,
      cookie: granted
    };

    console.log('[SUBSCRIPTION_STATUS] Final result:', {
      user_id: user.id,
      active: result.active,
      status: result.status,
      plan_tier: result.plan_tier,
      onboarding_completed: result.onboarding_completed,
      cookie: result.cookie
    });
    
    // Set cache headers for better performance
    res.setHeader('Cache-Control', 'private, max-age=30'); // Cache for 30 seconds
    setCorsHeaders(req, res);
    res.statusCode = 200;
    res.end(JSON.stringify(result));

  } catch (error) {
    console.error('[SUBSCRIPTION_STATUS] Error:', error);
    setCorsHeaders(req, res);
    res.statusCode = 500;
    res.end(JSON.stringify({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    }));
  }
}
