import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Sync Jobber Customers to Blipp Database
 * Imports all customers from Jobber and creates/updates them in customers table
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id } = req.body;

    if (!business_id) {
      return res.status(400).json({ error: 'business_id is required' });
    }

    console.log('[JOBBER_SYNC] Starting customer sync for business:', business_id);

    // Get Jobber integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations_jobber')
      .select('*')
      .eq('business_id', business_id)
      .eq('connection_status', 'connected')
      .single();

    if (integrationError || !integration) {
      console.error('[JOBBER_SYNC] No active Jobber integration found');
      return res.status(404).json({ error: 'Jobber not connected for this business' });
    }

    // Check if token needs refresh
    const needsRefresh = !integration.token_expires_at || 
                        new Date(integration.token_expires_at) <= new Date(Date.now() + 3600000); // 1 hour buffer

    let accessToken = integration.access_token;

    if (needsRefresh && integration.refresh_token) {
      console.log('[JOBBER_SYNC] Token expiring soon, refreshing...');
      try {
        const refreshedTokens = await refreshJobberToken(integration);
        accessToken = refreshedTokens.access_token;
      } catch (refreshError) {
        console.error('[JOBBER_SYNC] Token refresh failed:', refreshError);
        // Continue with old token - might still work
      }
    }

    // Fetch customers from Jobber using GraphQL
    console.log('[JOBBER_SYNC] Fetching customers from Jobber...');
    
    const customersResponse = await fetch('https://api.getjobber.com/api/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `{
          clients(first: 100) {
            nodes {
              id
              name
              emails {
                address
                primary
              }
              phones {
                number
                primary
              }
              property {
                address {
                  street1
                  street2
                  city
                  province
                  postalCode
                  country
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }`
      })
    });

    if (!customersResponse.ok) {
      const errorText = await customersResponse.text();
      console.error('[JOBBER_SYNC] Failed to fetch customers:', errorText);
      return res.status(500).json({ error: 'Failed to fetch customers from Jobber' });
    }

    const customersData = await customersResponse.json();
    const customers = customersData?.data?.clients?.nodes || [];

    console.log(`[JOBBER_SYNC] Fetched ${customers.length} customers from Jobber`);

    // Sync each customer to our database
    let syncedCount = 0;
    let errorCount = 0;

    for (const jobberCustomer of customers) {
      try {
        const primaryEmail = jobberCustomer.emails?.find(e => e.primary)?.address || jobberCustomer.emails?.[0]?.address;
        const primaryPhone = jobberCustomer.phones?.find(p => p.primary)?.number || jobberCustomer.phones?.[0]?.number;

        if (!primaryEmail && !primaryPhone) {
          console.log(`[JOBBER_SYNC] Skipping customer ${jobberCustomer.name} - no contact info`);
          continue;
        }

        // Build full address string
        const address = jobberCustomer.property?.address;
        const fullAddress = address 
          ? [address.street1, address.street2, address.city, address.province, address.postalCode, address.country]
              .filter(Boolean)
              .join(', ')
          : null;

        // Upsert customer
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .upsert({
            business_id: business_id,
            full_name: jobberCustomer.name,
            email: primaryEmail,
            phone: primaryPhone,
            address: fullAddress,
            status: 'active',
            created_by: (await supabase.from('businesses').select('created_by').eq('id', business_id).single()).data.created_by,
            external_id: jobberCustomer.id,
            source: 'jobber',
            last_synced_at: new Date().toISOString()
          }, {
            onConflict: 'business_id,email'
          })
          .select()
          .single();

        if (customerError) {
          console.error(`[JOBBER_SYNC] Error syncing customer ${jobberCustomer.name}:`, customerError);
          errorCount++;
        } else {
          syncedCount++;
          console.log(`✅ [JOBBER_SYNC] Synced: ${customer.full_name} (${customer.email})`);
        }

      } catch (error) {
        console.error(`[JOBBER_SYNC] Error processing customer:`, error);
        errorCount++;
      }
    }

    // Update integration with last sync time
    await supabase
      .from('integrations_jobber')
      .update({
        last_customer_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', integration.id);

    console.log(`✅ [JOBBER_SYNC] Sync complete: ${syncedCount} synced, ${errorCount} errors`);

    return res.status(200).json({
      success: true,
      synced: syncedCount,
      errors: errorCount,
      total: customers.length,
      message: `Successfully synced ${syncedCount} customers from Jobber`
    });

  } catch (error) {
    console.error('[JOBBER_SYNC] Fatal error:', error);
    return res.status(500).json({ 
      error: 'Customer sync failed',
      message: error.message
    });
  }
}

// Helper function to refresh Jobber token
async function refreshJobberToken(integration) {
  const tokenResponse = await fetch('https://api.getjobber.com/api/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.JOBBER_CLIENT_ID,
      client_secret: process.env.JOBBER_CLIENT_SECRET,
      refresh_token: integration.refresh_token
    })
  });

  if (!tokenResponse.ok) {
    throw new Error('Token refresh failed');
  }

  const tokenData = await tokenResponse.json();
  const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

  // Update the integration with new tokens
  await supabase
    .from('integrations_jobber')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || integration.refresh_token,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString()
    })
    .eq('id', integration.id);

  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || integration.refresh_token,
    token_expires_at: expiresAt
  };
}

