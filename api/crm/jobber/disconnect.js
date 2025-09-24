import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    // Get the connection
    const { data: connection, error: fetchError } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('business_id', businessId)
      .eq('crm_type', 'jobber')
      .single();

    if (fetchError || !connection) {
      return res.status(404).json({ error: 'Jobber connection not found' });
    }

    // Delete webhook if it exists
    if (connection.webhook_id && connection.access_token) {
      try {
        await fetch(`https://api.getjobber.com/api/webhooks/${connection.webhook_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
          }
        });
      } catch (webhookError) {
        console.error('Failed to delete Jobber webhook:', webhookError);
        // Continue with disconnection even if webhook deletion fails
      }
    }

    // Remove the connection from database
    const { error: deleteError } = await supabase
      .from('crm_connections')
      .delete()
      .eq('id', connection.id);

    if (deleteError) {
      throw new Error('Failed to delete connection');
    }

    return res.status(200).json({
      success: true,
      message: 'Jobber connection disconnected successfully'
    });

  } catch (error) {
    console.error('Jobber disconnect error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to disconnect from Jobber' 
    });
  }
}
