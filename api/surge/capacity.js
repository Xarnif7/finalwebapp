/**
 * Capacity Status Endpoint
 * GET /api/surge/capacity
 * Returns current SMS number usage and capacity
 */

const { supabase } = require('../_lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const maxNumbers = parseInt(process.env.SURGE_MAX_NUMBERS || '0', 10);
    
    // Count numbers in use
    const { count: inUse } = await supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .not('from_number', 'is', null);

    // Count queued requests
    const { count: queued } = await supabase
      .from('phone_provisioning_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'queued');

    return res.status(200).json({
      success: true,
      in_use: inUse || 0,
      max: maxNumbers,
      queued: queued || 0,
      unlimited: maxNumbers === 0
    });

  } catch (error) {
    console.error('[CAPACITY] Error:', error);
    return res.status(500).json({
      error: 'Failed to get capacity status',
      details: error.message
    });
  }
};
