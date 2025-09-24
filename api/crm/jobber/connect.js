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
    
    const { businessId, userId } = req.body;

    if (!businessId || !userId) {
      console.error('Missing required parameters:', { businessId, userId });
      return res.status(400).json({ error: 'Business ID and User ID are required' });
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

    // Generate OAuth state for security
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store state in database for verification
    await supabase
      .from('crm_connections')
      .upsert({
        business_id: businessId,
        crm_type: 'jobber',
        state: state,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    // Jobber OAuth URL
    const authUrl = `https://api.getjobber.com/api/oauth/authorize?` +
      `client_id=${process.env.JOBBER_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.JOBBER_REDIRECT_URI)}&` +
      `response_type=code&` +
      `state=${state}&` +
      `scope=read_jobs%20read_customers`;

    return res.status(200).json({
      success: true,
      authUrl: authUrl,
      state: state
    });

  } catch (error) {
    console.error('Jobber connection error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to initiate Jobber connection' 
    });
  }
}
