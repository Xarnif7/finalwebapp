import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    // Get QuickBooks integration
    const { data: integration, error: integrationError } = await supabase
      .from('business_integrations')
      .select('status, metadata_json, created_at, updated_at')
      .eq('business_id', business_id)
      .eq('provider', 'quickbooks')
      .single();

    if (integrationError || !integration) {
      return res.status(200).json({
        success: true,
        connected: false,
        message: 'No QuickBooks integration found'
      });
    }

    // Get customer count
    const { count: customerCount, error: countError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business_id)
      .eq('source', 'quickbooks');

    return res.status(200).json({
      success: true,
      connected: integration.status === 'active',
      status: integration.status,
      last_sync_at: integration.metadata_json?.last_sync_at || null,
      customer_count: customerCount || 0,
      connected_at: integration.created_at
    });

  } catch (error) {
    console.error('[QUICKBOOKS] Status check error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
