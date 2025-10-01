/**
 * Status Poll Endpoint (Cron)
 * POST /api/surge/status/poll
 */

const { supabase } = require('../../_lib/db');
const { getCapabilityStatus } = require('../../_lib/surgeClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const secret = req.headers['x-cron-secret'] || req.query.secret;
    if (!secret || secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, surge_account_id, verification_status')
      .eq('verification_status', 'pending')
      .limit(200);

    if (error) throw error;

    let updated = 0;
    for (const biz of (businesses || [])) {
      if (!biz.surge_account_id) continue;
      try {
        const { status, details } = await getCapabilityStatus({ accountId: biz.surge_account_id });
        if (status && status !== biz.verification_status) {
          await supabase
            .from('businesses')
            .update({ verification_status: status, last_verification_error: details || null })
            .eq('id', biz.id);
          updated += 1;
        }
      } catch (e) {
        console.error('[POLL] Failed for business', biz.id, e.message);
      }
    }

    return res.status(200).json({ success: true, checked: (businesses || []).length, updated });
  } catch (error) {
    console.error('[POLL] Error:', error.message);
    return res.status(500).json({ error: 'Failed to poll statuses' });
  }
};


