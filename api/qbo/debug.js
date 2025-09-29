import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const { business_id } = req.query;
    
    if (!business_id) {
      return res.status(400).json({ error: 'Missing business_id' });
    }

    // Get all integrations for this business
    const { data: integrations, error } = await supabase
      .from('integrations_quickbooks')
      .select('*')
      .eq('business_id', business_id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      business_id,
      integrations,
      count: integrations?.length || 0
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
