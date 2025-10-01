/**
 * Get SMS Status Endpoint
 * GET /api/surge/status?businessId=...
 * Returns current verification status for business
 */

const { getBusiness } = require('../_lib/db');
const { getCapabilityStatus } = require('../_lib/surgeClient');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'Missing businessId parameter' });
    }

    // TODO: Add authentication check to ensure user owns businessId
    console.log('[STATUS] TODO: Add auth check for businessId:', businessId);

    // Get the business
    const business = await getBusiness(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // If no SMS number provisioned yet
    if (!business.from_number) {
      return res.status(200).json({
        status: 'not_provisioned',
        message: 'No SMS number provisioned yet'
      });
    }

    // Get live status from Surge
    let liveStatus = null;
    let details = null;

    if (business.surge_account_id) {
      try {
        const capabilityStatus = await getCapabilityStatus(business.surge_account_id);
        liveStatus = capabilityStatus.status;
        details = capabilityStatus.details;
      } catch (error) {
        console.error('[STATUS] Error getting capability status:', error);
        // Fall back to database status
      }
    }

    // Use live status if available, otherwise use database status
    const currentStatus = liveStatus || business.verification_status;

    return res.status(200).json({
      status: currentStatus,
      from_number: business.from_number,
      sender_type: business.sender_type,
      last_error: business.last_verification_error,
      details: details || null
    });

  } catch (error) {
    console.error('[STATUS] Error:', error);
    return res.status(500).json({
      error: 'Failed to get SMS status',
      details: error.message
    });
  }
};
