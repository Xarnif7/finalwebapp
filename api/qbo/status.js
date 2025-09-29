import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    console.log('[QBO] STATUS ENDPOINT CALLED - DEPLOYMENT VERIFICATION');
    const { business_id } = req.query;

    if (!business_id) {
      return res.status(200).json({ 
        connected: false, 
        connectionStatus: 'error',
        error: 'Missing required parameter: business_id' 
      });
    }

    // Get QuickBooks integrations for this business
    const { data: integrations, error: integrationsError } = await supabase
      .from('integrations_quickbooks')
      .select('id, realm_id, access_token, connection_status, token_expires_at, last_full_sync_at, last_delta_sync_at, last_webhook_at, created_at, updated_at')
      .eq('business_id', business_id)
      .order('created_at', { ascending: false });

    if (integrationsError) {
      console.error('[QBO] Failed to get integrations:', integrationsError);
      return res.status(200).json({ 
        connected: false, 
        connectionStatus: 'error',
        error: 'Failed to get integration status' 
      });
    }

    if (!integrations || integrations.length === 0) {
      return res.status(200).json({
        connected: false,
        connectionStatus: 'error',
        error: 'No QuickBooks integrations found'
      });
    }

    // Get the most recent integration
    const integration = integrations[0];
    
    console.log(`[QBO] Status check for business ${business_id}:`, {
      integrationId: integration.id,
      connectionStatus: integration.connection_status,
      tokenExpiresAt: integration.token_expires_at,
      hasAccessToken: !!integration.access_token,
      timestamp: new Date().toISOString()
    });
    
    // Check token expiration and connection status
    const now = new Date();
    const isExpired = integration.token_expires_at && new Date(integration.token_expires_at) <= now;
    const isConnected = integration.connection_status === 'connected' && !isExpired;
    
    console.log(`[QBO] Connection check:`, {
      isExpired,
      isConnected,
      connectionStatus: integration.connection_status
    });
    
    // Determine connection status
    let connectionStatus = 'error';
    if (isConnected) {
      connectionStatus = 'connected';
    } else if (isExpired) {
      connectionStatus = 'expired';
    } else if (integration.connection_status === 'revoked') {
      connectionStatus = 'revoked';
    }

    // Get customer count
    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business_id)
      .eq('external_source', 'qbo');

    // Try to get company info from QuickBooks API
    let companyName = 'QuickBooks Company';
    if (isConnected && integration.access_token) {
      try {
        // Try production URL first, then sandbox if that fails
        let companyResponse = await fetch(`https://quickbooks.api.intuit.com/v3/company/${integration.realm_id}/companyinfo/${integration.realm_id}`, {
          headers: {
            'Authorization': `Bearer ${integration.access_token}`,
            'Accept': 'application/json'
          }
        });
        
        // If production fails, try sandbox
        if (!companyResponse.ok) {
          console.log('[QBO] Production API failed, trying sandbox:', companyResponse.status);
          companyResponse = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${integration.realm_id}/companyinfo/${integration.realm_id}`, {
            headers: {
              'Authorization': `Bearer ${integration.access_token}`,
              'Accept': 'application/json'
            }
          });
        }
        
        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          console.log('[QBO] Company API response data:', JSON.stringify(companyData, null, 2));
          
          // Try different response structures
          if (companyData.QueryResponse && companyData.QueryResponse.CompanyInfo && companyData.QueryResponse.CompanyInfo[0]) {
            // Old structure
            companyName = companyData.QueryResponse.CompanyInfo[0].CompanyName || 'QuickBooks Company';
            console.log('[QBO] Fetched company name (QueryResponse):', companyName);
          } else if (companyData.CompanyInfo && companyData.CompanyInfo.CompanyName) {
            // New structure
            companyName = companyData.CompanyInfo.CompanyName || 'QuickBooks Company';
            console.log('[QBO] Fetched company name (CompanyInfo):', companyName);
          } else {
            console.log('[QBO] Company data structure unexpected:', companyData);
          }
        } else {
          console.log('[QBO] Company API failed:', companyResponse.status, companyResponse.statusText);
        }
      } catch (error) {
        console.error('[QBO] Error fetching company info:', error);
      }
    }

    return res.status(200).json({
      connected: isConnected,
      connectionStatus,
      company: {
        realmId: integration.realm_id,
        name: companyName
      },
      lastFullSyncAt: integration.last_full_sync_at,
      lastDeltaSyncAt: integration.last_delta_sync_at,
      lastWebhookAt: integration.last_webhook_at,
      customerCount: customerCount || 0
    });

  } catch (error) {
    console.error('[QBO] Status endpoint error:', error);
    return res.status(200).json({ 
      connected: false, 
      connectionStatus: 'error',
      error: 'Internal server error' 
    });
  }
}