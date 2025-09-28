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
    const { business_id } = req.body;

    if (!business_id) {
      return res.status(400).json({ 
        error: 'Missing required field: business_id' 
      });
    }

    console.log(`[QBO] Bootstrap import requested for business ${business_id}`);

    // Get active QuickBooks integrations for this business
    const { data: integrations, error: integrationsError } = await supabase
      .from('integrations_quickbooks')
      .select('id, realm_id, access_token, refresh_token, token_expires_at, connection_status')
      .eq('business_id', business_id)
      .eq('connection_status', 'connected')
      .order('created_at', { ascending: false });

    if (integrationsError) {
      console.error('[QBO] Failed to get integrations:', integrationsError);
      return res.status(500).json({ 
        error: 'Failed to get QuickBooks integrations' 
      });
    }

    if (!integrations || integrations.length === 0) {
      return res.status(404).json({ 
        error: 'No active QuickBooks integrations found' 
      });
    }

    // Run bootstrap import for the most recent integration
    const integration = integrations[0];
    
    try {
      const result = await qboBootstrapImport(business_id, integration);
      
      return res.status(200).json({
        success: true,
        message: 'Bootstrap import completed successfully',
        records_found: result.recordsFound,
        records_upserted: result.recordsUpserted,
        realm_id: integration.realm_id
      });
      
    } catch (importError) {
      console.error('[QBO] Bootstrap import failed:', importError);
      
      return res.status(500).json({
        error: 'Bootstrap import failed',
        details: importError.message
      });
    }

  } catch (error) {
    console.error('[QBO] Bootstrap import error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// QBO Bootstrap Import function
async function qboBootstrapImport(businessId, integration) {
  const { realm_id, access_token, refresh_token } = integration;
  
  console.log(`[QBO] Starting bootstrap import for business ${businessId}, realm ${realm_id}`);
  
  // Create import log entry
  const { data: logEntry, error: logError } = await supabase
    .from('qbo_import_logs')
    .insert({
      business_id: businessId,
      type: 'customers',
      run_started_at: new Date().toISOString(),
      status: 'success',
      records_found: 0,
      records_upserted: 0
    })
    .select()
    .single();
    
  if (logError) {
    console.error('[QBO] Failed to create import log:', logError);
  }

  try {
    let allCustomers = [];
    let startPosition = 1;
    let hasMore = true;
    
    // Query all customers
    const query = 'SELECT * FROM Customer ORDER BY Id';
    
    console.log(`[QBO] Bootstrap query: ${query}`);
    
    // Page through results
    while (hasMore) {
      const response = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realm_id}/query?query=${encodeURIComponent(query)}&startposition=${startPosition}&maxresults=1000`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          console.log('[QBO] Token expired, attempting refresh...');
          await refreshQboToken(businessId, integration);
          // Retry with new token
          const { data: updatedIntegration } = await supabase
            .from('integrations_quickbooks')
            .select('access_token')
            .eq('id', integration.id)
            .single();
          
          if (updatedIntegration) {
            // Retry the request with new token
            const retryResponse = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realm_id}/query?query=${encodeURIComponent(query)}&startposition=${startPosition}&maxresults=1000`, {
              headers: {
                'Authorization': `Bearer ${updatedIntegration.access_token}`,
                'Accept': 'application/json'
              }
            });
            
            if (!retryResponse.ok) {
              throw new Error(`QBO API error: ${retryResponse.status}`);
            }
            
            const retryData = await retryResponse.json();
            const customers = retryData.QueryResponse?.Customer || [];
            allCustomers = allCustomers.concat(customers);
            
            hasMore = retryData.QueryResponse?.maxResults === 1000;
            startPosition += 1000;
          } else {
            throw new Error('Failed to refresh token');
          }
        } else {
          throw new Error(`QBO API error: ${response.status}`);
        }
      } else {
        const data = await response.json();
        const customers = data.QueryResponse?.Customer || [];
        allCustomers = allCustomers.concat(customers);
        
        hasMore = data.QueryResponse?.maxResults === 1000;
        startPosition += 1000;
      }
    }
    
    console.log(`[QBO] Found ${allCustomers.length} customers to import`);
    
    // Process each customer
    let upsertedCount = 0;
    
    for (const qboCustomer of allCustomers) {
      try {
        await upsertQboCustomer(businessId, qboCustomer);
        upsertedCount++;
      } catch (upsertError) {
        console.error(`[QBO] Failed to upsert customer ${qboCustomer.Id}:`, upsertError);
      }
    }
    
    // Update last_full_sync_at
    await supabase
      .from('integrations_quickbooks')
      .update({
        last_full_sync_at: new Date().toISOString(),
        last_delta_sync_at: new Date().toISOString(), // Also set delta sync time
        updated_at: new Date().toISOString()
      })
      .eq('id', integration.id);
    
    // Update import log
    if (logEntry) {
      await supabase
        .from('qbo_import_logs')
        .update({
          run_finished_at: new Date().toISOString(),
          status: 'success',
          records_found: allCustomers.length,
          records_upserted: upsertedCount
        })
        .eq('id', logEntry.id);
    }
    
    console.log(`[QBO] Bootstrap import completed: ${upsertedCount}/${allCustomers.length} customers upserted`);
    
    return {
      recordsFound: allCustomers.length,
      recordsUpserted: upsertedCount
    };
    
  } catch (error) {
    console.error('[QBO] Bootstrap import error:', error);
    
    // Update import log with error
    if (logEntry) {
      await supabase
        .from('qbo_import_logs')
        .update({
          run_finished_at: new Date().toISOString(),
          status: 'failed',
          error_message: error.message
        })
        .eq('id', logEntry.id);
    }
    
    throw error;
  }
}

// Helper function to upsert QBO customer (same as in sync-now.js)
async function upsertQboCustomer(businessId, qboCustomer) {
  const externalId = `qbo_${qboCustomer.Id}`;
  
  // Map QBO customer fields to our schema
  const customerData = {
    business_id: businessId,
    external_source: 'qbo',
    external_id: externalId,
    full_name: qboCustomer.DisplayName || `${qboCustomer.GivenName || ''} ${qboCustomer.FamilyName || ''}`.trim() || 'Unknown Customer',
    email: qboCustomer.PrimaryEmailAddr?.Address || null,
    phone: qboCustomer.PrimaryPhone?.FreeFormNumber || null,
    external_meta: {
      qbo_id: qboCustomer.Id,
      qbo_metadata: qboCustomer.Metadata,
      company_name: qboCustomer.CompanyName,
      given_name: qboCustomer.GivenName,
      family_name: qboCustomer.FamilyName,
      display_name: qboCustomer.DisplayName,
      fully_qualified_name: qboCustomer.FullyQualifiedName,
      primary_email: qboCustomer.PrimaryEmailAddr,
      primary_phone: qboCustomer.PrimaryPhone,
      billing_address: qboCustomer.BillAddr,
      shipping_address: qboCustomer.ShipAddr,
      active: qboCustomer.Active,
      balance: qboCustomer.Balance,
      balance_with_jobs: qboCustomer.BalanceWithJobs,
      currency_ref: qboCustomer.CurrencyRef,
      preferred_delivery_method: qboCustomer.PreferredDeliveryMethod,
      resale_num: qboCustomer.ResaleNum,
      taxable: qboCustomer.Taxable,
      tax_code: qboCustomer.TaxCode,
      print_on_check_name: qboCustomer.PrintOnCheckName,
      notes: qboCustomer.Notes,
      web_site: qboCustomer.WebSite,
      sync_token: qboCustomer.SyncToken,
      last_updated_time: qboCustomer.Metadata?.LastUpdatedTime
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Check if customer exists with different external_source
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id, external_source, full_name, email, phone')
    .eq('business_id', businessId)
    .eq('external_id', externalId)
    .single();
  
  if (existingCustomer) {
    if (existingCustomer.external_source === 'qbo') {
      // Update QBO customer - can update presentation fields
      const { error } = await supabase
        .from('customers')
        .update({
          full_name: customerData.full_name,
          email: customerData.email,
          phone: customerData.phone,
          external_meta: customerData.external_meta,
          updated_at: customerData.updated_at
        })
        .eq('id', existingCustomer.id);
        
      if (error) {
        throw new Error(`Failed to update customer: ${error.message}`);
      }
    } else {
      // Customer exists with different source - only update external_meta
      const { error } = await supabase
        .from('customers')
        .update({
          external_meta: customerData.external_meta,
          updated_at: customerData.updated_at
        })
        .eq('id', existingCustomer.id);
        
      if (error) {
        throw new Error(`Failed to update customer metadata: ${error.message}`);
      }
    }
  } else {
    // Insert new customer
    const { error } = await supabase
      .from('customers')
      .insert(customerData);
      
    if (error) {
      throw new Error(`Failed to insert customer: ${error.message}`);
    }
  }
}

// Helper function to refresh QBO token (same as in sync-now.js)
async function refreshQboToken(businessId, integration) {
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  
  const refreshResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integration.refresh_token
    })
  });
  
  if (!refreshResponse.ok) {
    throw new Error('Token refresh failed');
  }
  
  const tokenData = await refreshResponse.json();
  const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
  
  // Update integration with new tokens
  await supabase
    .from('integrations_quickbooks')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: tokenExpiresAt.toISOString(),
      connection_status: 'connected',
      updated_at: new Date().toISOString()
    })
    .eq('id', integration.id);
}
