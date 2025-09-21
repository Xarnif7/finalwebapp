import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch automation templates for the business
    const { data: templates, error } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching templates:', error);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }

    return res.status(200).json({
      success: true,
      templates: templates || []
    });

  } catch (error) {
    console.error('Error in templates API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
