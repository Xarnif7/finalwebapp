import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

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

    // Build the query - if realm_id is provided, disconnect specific realm, otherwise disconnect all
    let query = supabase
      .from('integrations_quickbooks')
      .select('id, realm_id, connection_status')
      .eq('business_id', business_id);

    if (realm_id) {
      query = query.eq('realm_id', realm_id);
    }

    const { data: integrations, error: selectError } = await query;

    if (selectError) {
      console.error('[QBO] Failed to find integrations:', selectError);
      return res.status(500).json({ 
        error: 'Failed to find QuickBooks integrations' 
      });
    }

    if (!integrations || integrations.length === 0) {
      return res.status(404).json({ 
        error: 'No QuickBooks integrations found' 
      });
    }

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

    const disconnectedRealms = integrations.map(integration => integration.realm_id);
    console.log(`[QBO] Successfully disconnected QuickBooks for business ${business_id}, realms: ${disconnectedRealms.join(', ')}`);

    return res.status(200).json({
      success: true,
      message: 'QuickBooks disconnected successfully',
      disconnected_realms: disconnectedRealms
    });

  } catch (error) {
    console.error('[QBO] Disconnect error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
