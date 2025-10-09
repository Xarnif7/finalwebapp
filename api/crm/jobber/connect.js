import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Jobber connect request received:', { body: req.body });
    
    const { business_id, businessId, userId } = req.body;
    const finalBusinessId = business_id || businessId;

    if (!finalBusinessId) {
      console.error('[JOBBER_CONNECT] Missing business_id');
      return res.status(400).json({ error: 'business_id is required' });
    }

    // Check if environment variables are set
    if (!process.env.JOBBER_CLIENT_ID || !process.env.JOBBER_REDIRECT_URI) {
      console.error('Missing Jobber environment variables:', {
        clientId: !!process.env.JOBBER_CLIENT_ID,
        redirectUri: !!process.env.JOBBER_REDIRECT_URI
      });
      return res.status(500).json({ 
        success: false, 
        error: 'Jobber integration not configured properly' 
      });
    }

    // Use business_id as state (simple and secure enough)
    const state = finalBusinessId;
    
    const redirectUri = process.env.JOBBER_REDIRECT_URI || `${process.env.APP_BASE_URL}/api/crm/jobber/callback`;

    // Jobber OAuth URL with required scopes
    const authUrl = `https://api.getjobber.com/api/oauth/authorize?` +
      `client_id=${process.env.JOBBER_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `state=${state}&` +
      `scope=jobs:read clients:read`;

    console.log('✅ [JOBBER_CONNECT] Generated OAuth URL');

    return res.status(200).json({
      success: true,
      authUrl: authUrl
    });

  } catch (error) {
    console.error('[JOBBER_CONNECT] Fatal error:', error);
    return res.status(500).json({ 
      error: 'Failed to initiate Jobber connection',
      message: error.message
    });
  }
}

