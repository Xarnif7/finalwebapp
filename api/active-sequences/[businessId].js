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

    // Fetch active sequences for the business
    const { data: sequences, error } = await supabase
      .from('automation_sequences')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching active sequences:', error);
      return res.status(500).json({ error: 'Failed to fetch active sequences' });
    }

    return res.status(200).json({
      success: true,
      sequences: sequences || []
    });

  } catch (error) {
    console.error('Error in active sequences API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
