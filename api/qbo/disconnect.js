import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id, realm_id } = req.body;

    if (!business_id) {
      return res.status(400).json({ 
        error: 'Missing required field: business_id' 
      });
    }

    console.log(`[QBO] Disconnecting QuickBooks for business ${business_id}${realm_id ? `, realm ${realm_id}` : ''}`);

    // Update connection status to revoked and clear sensitive data
    const { error: updateError } = await supabase
      .from('integrations_quickbooks')
      .update({
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        connection_status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .eq('business_id', business_id)
      .modify((query) => {
        if (realm_id) {
          query.eq('realm_id', realm_id);
        }
      });

    if (updateError) {
      console.error('[QBO] Failed to revoke connection:', updateError);
      return res.status(500).json({ 
        error: 'Failed to disconnect QuickBooks' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'QuickBooks disconnected successfully'
    });

  } catch (error) {
    console.error('[QBO] Disconnect error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}