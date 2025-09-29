import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('integrations_quickbooks')
      .select('id, business_id, connection_status')
      .limit(5);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      message: 'Database connection successful',
      integrations: data,
      count: data?.length || 0
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
