/**
 * Resubmit TFN Verification Endpoint
 * POST /api/surge/verification/resubmit
 */

const { getBusiness, updateBusiness } = require('../../_lib/db');
const { requireOwner } = require('../../_lib/auth');
const { submitTfnVerification } = require('../../_lib/surgeClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId, businessInfo } = req.body || {};
    if (!businessId || !businessInfo) {
      return res.status(400).json({ error: 'Missing required fields: businessId, businessInfo' });
    }

    await requireOwner(req, businessId);

    const business = await getBusiness(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    if (!business.surge_account_id) {
      return res.status(400).json({ error: 'Business has no Surge account configured' });
    }

    const { brand_name, legal_name, opt_in_method, opt_in_evidence_url, terms_url, privacy_url, estimated_monthly_volume } = businessInfo;
    const brandName = brand_name || legal_name;

    const verificationPayload = {
      brand_name: brandName,
      use_case_categories: ["account_notifications", "customer_care", "two_way_conversational"],
      use_case_summary: `Transactional notifications and customer care for ${brandName}. Examples include service confirmations and review/feedback follow-ups. No promotional content. All messages honor STOP/HELP.`,
      sample_messages: [
        `Hi {First}—it's ${brandName}. Thanks again for choosing us today. Would you leave a quick review? {link} Reply STOP to opt out, HELP for help. Msg & data rates may apply.`,
        `${brandName} support: We received your feedback and we're on it. Reply here with any details. Reply STOP to opt out, HELP for help. Msg & data rates may apply.`
      ],
      opt_in: {
        method: opt_in_method,
        evidence_url: opt_in_evidence_url
      },
      terms_url,
      privacy_url,
      estimated_monthly_volume: Number(estimated_monthly_volume)
    };

    const { verificationId } = await submitTfnVerification({
      accountId: business.surge_account_id,
      payload: verificationPayload,
    });

    await updateBusiness(businessId, {
      verification_status: 'pending',
      last_verification_error: null,
      tfn_verification_id: verificationId,
    });

    return res.status(200).json({ success: true, status: 'pending', verification_id: verificationId });
  } catch (error) {
    const status = error.statusCode || 500;
    console.error('[RESUBMIT] Error:', error.message);
    return res.status(status).json({ error: error.message || 'Failed to resubmit verification' });
  }
};


