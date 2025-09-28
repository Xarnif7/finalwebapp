import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id } = req.query;

    if (!business_id) {
      return res.status(400).json({ 
        error: 'Missing required parameter: business_id' 
      });
    }

    // Verify business exists and user has access
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', business_id)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ 
        error: 'Business not found' 
      });
    }

    // Get QBO configuration from environment
    const clientId = process.env.QBO_CLIENT_ID;
    const scopes = process.env.QBO_SCOPES || 'com.intuit.quickbooks.accounting';
    const redirectUri = process.env.QBO_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error('[QBO] Missing QBO environment variables');
      return res.status(500).json({ 
        error: 'QuickBooks integration not configured' 
      });
    }

    // Generate state parameter (nonce) using business_id
    const state = business_id;

    // Build Intuit authorize URL
    const authorizeUrl = new URL('https://appcenter.intuit.com/connect/oauth2');
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('scope', scopes);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('prompt', 'consent');

    console.log(`[QBO] Redirecting business ${business_id} to QuickBooks authorization`);
    console.log(`[QBO] Authorize URL: ${authorizeUrl.toString()}`);

    // 302 redirect to Intuit
    return res.redirect(302, authorizeUrl.toString());

  } catch (error) {
    console.error('[QBO] Connect error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
