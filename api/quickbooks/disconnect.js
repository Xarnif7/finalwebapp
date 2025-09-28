import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    // Update integration status to disconnected
    const { data: integration, error: integrationError } = await supabase
      .from('business_integrations')
      .update({
        status: 'disconnected',
        metadata_json: {
          disconnected_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('business_id', business_id)
      .eq('provider', 'quickbooks')
      .select()
      .single();

    if (integrationError) {
      console.error('[QUICKBOOKS] Disconnect error:', integrationError);
      return res.status(500).json({ 
        error: 'Failed to disconnect QuickBooks integration',
        details: integrationError
      });
    }

    console.log('[QUICKBOOKS] Successfully disconnected business:', business_id);

    return res.status(200).json({
      success: true,
      message: 'QuickBooks disconnected successfully'
    });

  } catch (error) {
    console.error('[QUICKBOOKS] Disconnect error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
