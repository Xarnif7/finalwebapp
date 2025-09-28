import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to refresh QuickBooks access token
async function refreshQuickBooksToken(refreshToken) {
  try {
    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    return await response.json();
  } catch (error) {
    console.error('[QUICKBOOKS] Token refresh failed:', error);
    throw error;
  }
}

// Helper function to make QuickBooks API calls
async function makeQuickBooksAPICall(accessToken, realmId, endpoint) {
  try {
    const response = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      throw new Error(`API call failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[QUICKBOOKS] API call failed:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id } = req.body;

    if (!business_id) {
      return res.status(400).json({ 
        error: 'Missing required field: business_id' 
      });
    }

    // Get QuickBooks integration
    const { data: integration, error: integrationError } = await supabase
      .from('business_integrations')
      .select('metadata_json')
      .eq('business_id', business_id)
      .eq('provider', 'quickbooks')
      .eq('status', 'active')
      .single();

    if (integrationError || !integration) {
      return res.status(400).json({ 
        error: 'No active QuickBooks integration found for this business' 
      });
    }

    const { access_token, refresh_token, realm_id } = integration.metadata_json;
    let currentAccessToken = access_token;

    try {
      // Fetch customers from QuickBooks
      const customersResponse = await makeQuickBooksAPICall(
        currentAccessToken, 
        realm_id, 
        'customers'
      );

      if (!customersResponse.QueryResponse || !customersResponse.QueryResponse.Customer) {
        return res.status(200).json({
          success: true,
          message: 'No customers found in QuickBooks',
          synced_count: 0
        });
      }

      const quickbooksCustomers = customersResponse.QueryResponse.Customer;
      let syncedCount = 0;

      // Process each customer
      for (const qbCustomer of quickbooksCustomers) {
        try {
          // Extract customer data
          const customerData = {
            business_id: business_id,
            full_name: qbCustomer.Name || 'Unknown Customer',
            email: qbCustomer.PrimaryEmailAddr?.Address || null,
            phone: qbCustomer.PrimaryPhone?.FreeFormNumber || null,
            external_id: `qb_${qbCustomer.Id}`,
            source: 'quickbooks',
            tags: ['quickbooks-customer'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Skip if no email or phone
          if (!customerData.email && !customerData.phone) {
            console.log('[QUICKBOOKS] Skipping customer without contact info:', customerData.full_name);
            continue;
          }

          // Upsert customer
          const { data: customer, error: upsertError } = await supabase
            .from('customers')
            .upsert(customerData, {
              onConflict: 'business_id,external_id',
              ignoreDuplicates: false
            })
            .select('id, full_name, email')
            .single();

          if (upsertError) {
            console.error('[QUICKBOOKS] Error upserting customer:', upsertError);
            continue;
          }

          syncedCount++;
          console.log('[QUICKBOOKS] Synced customer:', customer.full_name, customer.email);

        } catch (customerError) {
          console.error('[QUICKBOOKS] Error processing customer:', customerError);
          continue;
        }
      }

      // Update last sync timestamp
      await supabase
        .from('business_integrations')
        .update({
          metadata_json: {
            ...integration.metadata_json,
            last_sync_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('business_id', business_id)
        .eq('provider', 'quickbooks');

      return res.status(200).json({
        success: true,
        message: `Successfully synced ${syncedCount} customers from QuickBooks`,
        synced_count: syncedCount,
        total_found: quickbooksCustomers.length
      });

    } catch (apiError) {
      if (apiError.message === 'UNAUTHORIZED') {
        // Try to refresh token
        try {
          const newTokenData = await refreshQuickBooksToken(refresh_token);
          
          // Update integration with new tokens
          await supabase
            .from('business_integrations')
            .update({
              metadata_json: {
                ...integration.metadata_json,
                access_token: newTokenData.access_token,
                refresh_token: newTokenData.refresh_token,
                expires_in: newTokenData.expires_in
              },
              updated_at: new Date().toISOString()
            })
            .eq('business_id', business_id)
            .eq('provider', 'quickbooks');

          // Retry the sync with new token
          return handler(req, res);
        } catch (refreshError) {
          console.error('[QUICKBOOKS] Token refresh failed:', refreshError);
          return res.status(401).json({ 
            error: 'QuickBooks connection expired. Please reconnect your account.' 
          });
        }
      }
      
      throw apiError;
    }

  } catch (error) {
    console.error('[QUICKBOOKS] Sync error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
