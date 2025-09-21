import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { businessId } = req.query;

  if (!businessId) {
    return res.status(400).json({ error: 'Business ID is required' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method === 'GET') {
    try {
      // Get Zapier integrations for this business
      const { data: integrations, error } = await supabase
        .from('business_zapier_integrations')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching Zapier integrations:', error);
        return res.status(500).json({ error: 'Failed to fetch integrations' });
      }

      return res.status(200).json({
        success: true,
        integrations: integrations || []
      });

    } catch (error) {
      console.error('Error in Zapier integrations API:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { zapier_account_email, zap_config, webhook_url, webhook_secret } = req.body;

      if (!zapier_account_email || !zap_config) {
        return res.status(400).json({ error: 'Zapier account email and config are required' });
      }

      // Create new Zapier integration
      const { data: integration, error } = await supabase
        .from('business_zapier_integrations')
        .insert({
          business_id: businessId,
          zapier_account_email,
          zap_config,
          webhook_url,
          webhook_secret,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating Zapier integration:', error);
        return res.status(500).json({ error: 'Failed to create integration' });
      }

      return res.status(201).json({
        success: true,
        integration
      });

    } catch (error) {
      console.error('Error in Zapier integrations API:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { integration_id, status, error_message, last_sync_at } = req.body;

      if (!integration_id || !status) {
        return res.status(400).json({ error: 'Integration ID and status are required' });
      }

      const updateData = { status };
      if (error_message) updateData.error_message = error_message;
      if (last_sync_at) updateData.last_sync_at = last_sync_at;

      const { data: integration, error } = await supabase
        .from('business_zapier_integrations')
        .update(updateData)
        .eq('id', integration_id)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        console.error('Error updating Zapier integration:', error);
        return res.status(500).json({ error: 'Failed to update integration' });
      }

      return res.status(200).json({
        success: true,
        integration
      });

    } catch (error) {
      console.error('Error in Zapier integrations API:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
