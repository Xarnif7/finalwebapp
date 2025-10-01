/**
 * Provision SMS Number Endpoint
 * POST /api/surge/provision-number
 * Creates Surge account, purchases TFN, submits verification
 */

const { getBusiness, updateBusiness } = require('../_lib/db');
const {
  createOrGetAccountForBusiness,
  purchaseTollFreeNumber,
  submitTfnVerification
} = require('../_lib/surgeClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId, businessInfo } = req.body;

    // Validate required fields
    if (!businessId || !businessInfo) {
      return res.status(400).json({ 
        error: 'Missing required fields: businessId, businessInfo' 
      });
    }

    const {
      legal_name,
      website,
      address,
      ein_or_sole_prop,
      contact_name,
      contact_email,
      opt_in_method,
      terms_url,
      privacy_url
    } = businessInfo;

    if (!legal_name || !contact_email) {
      return res.status(400).json({
        error: 'Missing required business info: legal_name, contact_email'
      });
    }

    // TODO: Add authentication check to ensure user owns businessId
    console.log('[PROVISION] TODO: Add auth check for businessId:', businessId);

    // Get the business
    const business = await getBusiness(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Check if business already has a number
    if (business.from_number) {
      return res.status(400).json({
        error: 'Business already has an SMS number',
        from_number: business.from_number,
        status: business.verification_status
      });
    }

    console.log('[PROVISION] Starting SMS provisioning for business:', businessId);

    // Step 1: Create or get Surge account
    const { accountId } = await createOrGetAccountForBusiness(business);
    console.log('[PROVISION] Account ID:', accountId);

    // Step 2: Purchase toll-free number
    const { phoneId, e164 } = await purchaseTollFreeNumber(accountId);
    console.log('[PROVISION] Purchased TFN:', e164);

    // Step 3: Submit TFN verification
    const { verificationId, status } = await submitTfnVerification(accountId, businessInfo);
    console.log('[PROVISION] Verification submitted:', verificationId, status);

    // Step 4: Update business record
    await updateBusiness(businessId, {
      surge_account_id: accountId,
      surge_phone_id: phoneId,
      from_number: e164,
      sender_type: 'tfn',
      verification_status: 'pending',
      last_verification_error: null
    });

    console.log('[PROVISION] Business updated successfully');

    return res.status(200).json({
      success: true,
      from_number: e164,
      status: 'pending',
      message: 'TFN provisioned and verification submitted. Pending approval.'
    });

  } catch (error) {
    console.error('[PROVISION] Error:', error);
    return res.status(500).json({
      error: 'Failed to provision SMS number',
      details: error.message
    });
  }
};
