import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { businessId } = req.query;

  if (!businessId) {
    return res.status(400).json({ error: 'Business ID is required' });
  }

  try {
    // Get active templates (status = 'active')
    const { data: templates, error } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active sequences:', error);
      return res.status(500).json({ error: 'Failed to fetch active sequences' });
    }

    // Transform templates to sequences format
    const sequences = templates.map(template => ({
      id: template.id,
      name: template.name,
      key: template.key,
      trigger_type: template.trigger_type,
      channels: template.channels || ['email'],
      status: template.status,
      description: template.description,
      config_json: template.config_json,
      created_at: template.created_at,
      updated_at: template.updated_at
    }));

    res.status(200).json({ sequences });
  } catch (error) {
    console.error('Error in active sequences API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}