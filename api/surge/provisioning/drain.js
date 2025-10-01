/**
 * Drain provisioning queue until capacity is reached
 * POST /api/surge/provisioning/drain
 */

const { supabase, getBusiness, updateBusiness } = require('../../_lib/db');
const { purchaseTollFreeNumber, submitTfnVerification } = require('../../_lib/surgeClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminToken = req.headers['x-admin-token'] || req.query.token;
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const maxNumbers = parseInt(process.env.SURGE_MAX_NUMBERS || '0', 10);
    if (maxNumbers === 0) {
      return res.status(200).json({ success: true, drained: 0, message: 'Unlimited capacity; nothing to drain' });
    }

    const { count: numbersInUse } = await supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .not('from_number', 'is', null);

    let remaining = Math.max(0, maxNumbers - (numbersInUse || 0));
    if (remaining <= 0) {
      return res.status(200).json({ success: true, drained: 0, message: 'No capacity available' });
    }

    const { data: queued } = await supabase
      .from('phone_provisioning_queue')
      .select('id, business_id')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(remaining);

    let drained = 0;
    for (const row of (queued || [])) {
      try {
        await supabase
          .from('phone_provisioning_queue')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', row.id);

        const business = await getBusiness(row.business_id);
        if (!business || !business.surge_account_id) {
          throw new Error('Business missing Surge account');
        }

        const { phoneId, e164 } = await purchaseTollFreeNumber({ accountId: business.surge_account_id });

        const brandName = business.brand_name || business.name || 'Your Business';
        const verificationPayload = {
          brand_name: brandName,
          use_case_categories: ["account_notifications", "customer_care", "two_way_conversational"],
          use_case_summary: `Transactional notifications and customer care for ${brandName}. Examples include service confirmations and review/feedback follow-ups. No promotional content. All messages honor STOP/HELP.`,
          sample_messages: [
            `Hi {First}—it's ${brandName}. Thanks again for choosing us today. Would you leave a quick review? {link} Reply STOP to opt out, HELP for help. Msg & data rates may apply.`,
            `${brandName} support: We received your feedback and we're on it. Reply here with any details. Reply STOP to opt out, HELP for help. Msg & data rates may apply.`
          ],
          opt_in: { method: 'website', evidence_url: business.opt_in_evidence_url || '' },
          terms_url: business.terms_url || '',
          privacy_url: business.privacy_url || '',
          estimated_monthly_volume: Number(business.estimated_monthly_volume || 100),
        };

        const { verificationId } = await submitTfnVerification({ accountId: business.surge_account_id, payload: verificationPayload });

        await updateBusiness(row.business_id, {
          surge_phone_id: phoneId,
          from_number: e164,
          sender_type: 'tfn',
          verification_status: 'pending',
          last_verification_error: null,
          tfn_verification_id: verificationId
        });

        await supabase
          .from('phone_provisioning_queue')
          .update({ status: 'done', updated_at: new Date().toISOString() })
          .eq('id', row.id);

        drained += 1;
        remaining -= 1;
        if (remaining <= 0) break;
      } catch (err) {
        await supabase
          .from('phone_provisioning_queue')
          .update({ status: 'error', error: err.message, updated_at: new Date().toISOString() })
          .eq('id', row.id);
      }
    }

    return res.status(200).json({ success: true, drained });
  } catch (error) {
    console.error('[DRAIN] Error:', error.message);
    return res.status(500).json({ error: 'Failed to drain queue' });
  }
};


