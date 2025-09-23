import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Find business by email
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('created_by', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error finding business by email:', error);
      return res.status(500).json({ error: 'Failed to find business' });
    }

    res.status(200).json({ business });
  } catch (error) {
    console.error('Error in business by email API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
