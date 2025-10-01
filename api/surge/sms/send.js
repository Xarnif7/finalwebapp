/**
 * Send SMS Endpoint
 * POST /api/surge/sms/send
 * Sends an SMS message with compliance checks
 */

const { getBusiness } = require('../../_lib/db');
const { getContact, insertMessage } = require('../../_lib/db');
const { sendMessage } = require('../../_lib/surgeClient');
const { normalizeToE164, isLikelyE164 } = require('../../_lib/phone');
const { ensureFooter } = require('../../_lib/compliance');
const { requireOwner } = require('../../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId, to, body } = req.body;

    // Validate required fields
    if (!businessId || !to || !body) {
      return res.status(400).json({
        error: 'Missing required fields: businessId, to, body'
      });
    }

    // Auth: ensure caller owns businessId
    await requireOwner(req, businessId);

    // Get the business
    const business = await getBusiness(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Check if business has SMS enabled
    if (!business.from_number) {
      return res.status(400).json({
        error: 'SMS not enabled for this business',
        message: 'Please provision an SMS number first'
      });
    }

    // Check verification status
    if (business.verification_status !== 'active') {
      let message = 'SMS sending not available';
      
      if (business.verification_status === 'pending') {
        message = 'Your toll-free number is pending verification';
      } else if (business.verification_status === 'action_needed') {
        message = 'Verification requires action: ' + (business.last_verification_error || 'Please contact support');
      } else if (business.verification_status === 'disabled') {
        message = 'SMS sending is disabled for this business';
      }
      
      return res.status(403).json({
        error: 'SMS sending not allowed',
        message: message,
        status: business.verification_status
      });
    }

    // Normalize and validate phone number
    const normalizedTo = normalizeToE164(to);
    if (!normalizedTo || !isLikelyE164(normalizedTo)) {
      return res.status(400).json({
        error: 'Invalid phone number',
        message: 'Phone number must be in E.164 format (e.g., +14155551234)'
      });
    }

    // Check if recipient has opted out
    const contact = await getContact(businessId, normalizedTo);
    if (contact && contact.opted_out) {
      return res.status(403).json({
        error: 'Recipient has opted out',
        message: 'This recipient has opted out of SMS communications'
      });
    }

    // Ensure compliance footer
    const compliantBody = ensureFooter(body);

    console.log(`[SMS_SEND] Sending SMS from ${business.from_number} to ${normalizedTo.substring(0, 8)}****`);

    // Send via Surge
    const result = await sendMessage({
      accountId: business.surge_account_id,
      from: business.from_number,
      to: normalizedTo,
      body: compliantBody
    });

    // Store outbound message
    await insertMessage({
      business_id: businessId,
      customer_id: null, // TODO: Link to customer if available
      direction: 'outbound',
      channel: 'sms',
      body: compliantBody,
      status: result.status,
      surge_message_id: result.messageId,
      error: null
    });

    console.log('[SMS_SEND] Message sent successfully:', result.messageId);

    return res.status(200).json({
      success: true,
      message_id: result.messageId,
      status: result.status,
      to: normalizedTo
    });

  } catch (error) {
    console.error('[SMS_SEND] Error:', error);
    return res.status(500).json({
      error: 'Failed to send SMS',
      details: error.message
    });
  }
};
