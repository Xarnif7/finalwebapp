/**
 * Surge Status Endpoint
 * GET /api/surge/status?businessId=xxx
 * Checks verification status and updates database
 */

const { getBusiness, updateBusiness } = require('../_lib/db');
const { getCapabilityStatus } = require('../_lib/surgeClient');
const { requireOwner } = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId query parameter required' });
    }

    // Auth: ensure caller owns the business
    await requireOwner(req, businessId);

    // Get the business
    const business = await getBusiness(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    if (!business.surge_account_id) {
      return res.status(400).json({ 
        error: 'Business has no Surge account',
        message: 'Please provision an SMS number first'
      });
    }

    console.log('[STATUS] Checking capability status for account:', business.surge_account_id);

    // Get capability status from Surge
    const { status, details } = await getCapabilityStatus({ 
      accountId: business.surge_account_id 
    });

    // Update business if status changed
    if (status !== business.verification_status) {
      await updateBusiness(businessId, {
        verification_status: status,
        last_verification_error: status === 'action_needed' ? details : null
      });
      console.log('[STATUS] Updated verification status:', status);
    }

    return res.status(200).json({
      success: true,
      status: status,
      details: details || null
    });

  } catch (error) {
    console.error('[STATUS] Error:', error);
    return res.status(500).json({
      error: 'Failed to check status',
      details: error.message
    });
  }
};