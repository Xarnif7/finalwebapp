import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get customer count for a business
 * Optionally filter by source (jobber, quickbooks, etc.)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id, source } = req.query;

    if (!business_id) {
      return res.status(400).json({ error: 'business_id is required' });
    }

    // Build query
    let query = supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business_id);

    // Add source filter if provided
    if (source) {
      query = query.eq('source', source);
    }

    const { count, error } = await query;

    if (error) {
      console.error('[CUSTOMER_COUNT] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch customer count' });
    }

    return res.status(200).json({
      count: count || 0,
      business_id,
      source: source || 'all'
    });

  } catch (error) {
    console.error('[CUSTOMER_COUNT] Fatal error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch customer count',
      message: error.message
    });
  }
}

