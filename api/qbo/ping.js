import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Only allow in development or with explicit permission
  if (process.env.NODE_ENV === 'production' && !process.env.QBO_PING_ENABLED) {
    return res.status(404).json({ error: 'Not found' });
  }

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

    console.log(`[QBO] Ping test requested for business ${business_id}`);

    // Get active QuickBooks integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations_quickbooks')
      .select('realm_id, access_token, refresh_token, connection_status')
      .eq('business_id', business_id)
      .eq('connection_status', 'connected')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (integrationError || !integration) {
      return res.status(404).json({ 
        error: 'No active QuickBooks integration found',
        business_id: business_id
      });
    }

    const { realm_id, access_token } = integration;

    // Test QBO API access with a simple customer query
    const testQuery = 'SELECT Id, DisplayName FROM Customer MAXRESULTS 1';
    const apiUrl = `https://quickbooks.api.intuit.com/v3/company/${realm_id}/query?query=${encodeURIComponent(testQuery)}`;

    console.log(`[QBO] Testing API access for realm ${realm_id}`);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({
          success: false,
          error: 'Token expired or invalid',
          realm_id: realm_id,
          business_id: business_id,
          status: response.status,
          statusText: response.statusText
        });
      }

      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: 'QBO API error',
        realm_id: realm_id,
        business_id: business_id,
        status: response.status,
        statusText: response.statusText,
        details: errorText
      });
    }

    const data = await response.json();
    const customers = data.QueryResponse?.Customer || [];
    const customerCount = data.QueryResponse?.maxResults || 0;

    console.log(`[QBO] Ping successful - found ${customers.length} customers`);

    return res.status(200).json({
      success: true,
      message: 'QuickBooks API access confirmed',
      business_id: business_id,
      realm_id: realm_id,
      test_query: testQuery,
      customers_found: customers.length,
      max_results: customerCount,
      sample_customer: customers.length > 0 ? {
        id: customers[0].Id,
        display_name: customers[0].DisplayName
      } : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[QBO] Ping test error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message,
      business_id: business_id
    });
  }
}
