import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Disconnect Jobber Integration
 * Revokes tokens and marks connection as disconnected
 */

export default async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id } = req.body || req.query;

    if (!business_id) {
      return res.status(400).json({ error: 'business_id is required' });
    }

    console.log('[JOBBER_DISCONNECT] Disconnecting Jobber for business:', business_id);

    // Update integration to disconnected status
    const { error: updateError } = await supabase
      .from('integrations_jobber')
      .update({
        connection_status: 'disconnected',
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('business_id', business_id);

    if (updateError) {
      console.error('[JOBBER_DISCONNECT] Error disconnecting:', updateError);
      return res.status(500).json({ error: 'Failed to disconnect Jobber' });
    }

    console.log('✅ [JOBBER_DISCONNECT] Jobber disconnected successfully');

    return res.status(200).json({
      success: true,
      message: 'Jobber disconnected successfully'
    });

  } catch (error) {
    console.error('[JOBBER_DISCONNECT] Fatal error:', error);
    return res.status(500).json({ 
      error: 'Failed to disconnect Jobber',
      message: error.message
    });
  }
}
