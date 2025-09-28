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

    // Get QuickBooks integrations for this business
    const { data: integrations, error: integrationsError } = await supabase
      .from('integrations_quickbooks')
      .select('id, realm_id, connection_status, token_expires_at, last_full_sync_at, last_webhook_at, created_at, updated_at')
      .eq('business_id', business_id)
      .order('created_at', { ascending: false });

    if (integrationsError) {
      console.error('[QBO] Failed to get integrations:', integrationsError);
      return res.status(500).json({ 
        error: 'Failed to get integration status' 
      });
    }

    if (!integrations || integrations.length === 0) {
      return res.status(200).json({
        success: true,
        connected: false,
        status: 'not_connected',
        message: 'No QuickBooks integrations found',
        integrations: []
      });
    }

    // Check token expiration and connection status
    const now = new Date();
    let hasValidConnection = false;
    let connectionDetails = [];

    for (const integration of integrations) {
      const isExpired = integration.token_expires_at && new Date(integration.token_expires_at) <= now;
      const isConnected = integration.connection_status === 'connected' && !isExpired;
      
      if (isConnected) {
        hasValidConnection = true;
      }

      connectionDetails.push({
        realm_id: integration.realm_id,
        status: isExpired ? 'expired' : integration.connection_status,
        token_expires_at: integration.token_expires_at,
        is_expired: isExpired,
        last_sync_at: integration.last_full_sync_at,
        last_webhook_at: integration.last_webhook_at,
        connected_at: integration.created_at,
        updated_at: integration.updated_at
      });
    }

    // Get customer count for this business
    const { count: customerCount, error: countError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business_id)
      .eq('external_source', 'qbo');

    // Get latest webhook timestamp
    const latestWebhook = integrations.reduce((latest, integration) => {
      if (integration.last_webhook_at) {
        const webhookTime = new Date(integration.last_webhook_at);
        if (!latest || webhookTime > new Date(latest)) {
          return integration.last_webhook_at;
        }
      }
      return latest;
    }, null);

    return res.status(200).json({
      success: true,
      connected: hasValidConnection,
      status: hasValidConnection ? 'connected' : 'disconnected',
      customer_count: customerCount || 0,
      integrations: connectionDetails,
      last_webhook_at: latestWebhook
    });

  } catch (error) {
    console.error('[QBO] Status check error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}