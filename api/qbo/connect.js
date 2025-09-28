import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  try {
    const { business_id } = req.query;

    if (!business_id) {
      return res.status(400).json({ 
        error: 'Missing required parameter: business_id' 
      });
    }

    // Get QBO configuration from environment
    const clientId = process.env.QBO_CLIENT_ID;
    const scopes = process.env.QBO_SCOPES || 'com.intuit.quickbooks.accounting';
    const redirectUri = process.env.QBO_REDIRECT_URI;

    console.log('[QBO] Environment variables:', {
      clientId: clientId ? 'SET' : 'MISSING',
      redirectUri: redirectUri || 'MISSING',
      scopes: scopes
    });

    if (!clientId || !redirectUri) {
      console.error('[QBO] Missing QBO environment variables:', {
        clientId: !!clientId,
        redirectUri: !!redirectUri
      });
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