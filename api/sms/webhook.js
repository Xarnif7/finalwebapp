/**
 * Unified SMS Webhook Endpoint
 * POST /api/sms/webhook
 * Handles all Surge webhook events: delivery status, inbound messages, verification updates
 */

const { verifySignature, sendMessage } = require('../_lib/surgeClient');
const { ensureFooter, matchesStopKeyword, matchesHelpKeyword } = require('../_lib/compliance');
const {
  updateBusiness,
  upsertMessage,
  updateMessageStatus,
  upsertContact,
  setContactOptedOut,
  getBusinessByFromNumber,
  supabase
} = require('../_lib/db');

/**
 * Handle inbound SMS message
 */
async function handleInbound(event) {
  try {
    const { to, from, body, id: surgeMessageId } = event.data || {};

    console.log(`[WEBHOOK] Inbound SMS from ${from?.substring(0, 8)}**** to ${to}`);

    if (!to || !from || !body) {
      console.error('[WEBHOOK] Missing required fields in inbound event');
      return;
    }

    // Find business by their from_number (the 'to' in this inbound message)
    const business = await getBusinessByFromNumber(to);
    
    if (!business) {
      console.error('[WEBHOOK] No business found for number:', to);
      return;
    }

    // Upsert contact
    await upsertContact({
      business_id: business.id,
      phone_e164: from,
      name: null,
      email: null
    });

    // STOP keywords
    if (matchesStopKeyword(body)) {
      console.log(`[WEBHOOK] STOP keyword detected from ${from}`);
      await setContactOptedOut(business.id, from, true);
      // One-time auto-reply confirming opt-out
      try {
        await sendMessage({
          accountId: business.surge_account_id,
          from: business.from_number,
          to: from,
          body: "You're opted out and won't receive SMS from our business. Reply START to opt in."
        });
      } catch (replyError) {
        console.error('[WEBHOOK] Error sending STOP auto-reply:', replyError.message);
      }
    }

    // HELP keywords
    if (matchesHelpKeyword(body)) {
      console.log(`[WEBHOOK] HELP keyword detected from ${from}`);
      try {
        await sendMessage({
          accountId: business.surge_account_id,
          from: business.from_number,
          to: from,
          body: ensureFooter('Thanks for reaching out. For assistance, reply here or email support@myblipp.com.')
        });
      } catch (replyError) {
        console.error('[WEBHOOK] Error sending HELP auto-reply:', replyError.message);
      }
    }

    // Insert inbound message
    await upsertMessage({
      business_id: business.id,
      customer_id: null,
      direction: 'inbound',
      channel: 'sms',
      body: body,
      status: 'received',
      surge_message_id: surgeMessageId,
      error: null
    });

    console.log('[WEBHOOK] Inbound message processed successfully');
  } catch (error) {
    console.error('[WEBHOOK] Error handling inbound:', error);
  }
}

/**
 * Handle message delivery status update
 */
async function handleDeliveryStatus(event) {
  try {
    const { id: surgeMessageId, status, error } = event.data || {};

    console.log(`[WEBHOOK] Delivery status update: ${surgeMessageId} -> ${status}`);

    if (!surgeMessageId) {
      console.error('[WEBHOOK] Missing message ID in delivery status event');
      return;
    }

    // Upsert message by surge_message_id
    await upsertMessage({
      surge_message_id: surgeMessageId,
      status: status,
      error: error || null
    });

    console.log('[WEBHOOK] Message status updated successfully');
  } catch (error) {
    console.error('[WEBHOOK] Error handling delivery status:', error);
  }
}

/**
 * Handle verification/capability status update
 */
async function handleVerificationUpdate(event) {
  try {
    const { account_id, status, error, details } = event.data || {};

    console.log(`[WEBHOOK] Verification update for account ${account_id}: ${status}`);

    if (!account_id || !status) {
      console.error('[WEBHOOK] Missing required fields in verification event');
      return;
    }

    // Map Surge status to our enum
    let mappedStatus = 'pending';
    if (status === 'approved' || status === 'active' || status === 'verified') {
      mappedStatus = 'active';
    } else if (status === 'rejected' || status === 'failed') {
      mappedStatus = 'disabled';
    } else if (status === 'action_required' || status === 'incomplete') {
      mappedStatus = 'action_needed';
    }

    // Find business by surge_account_id
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id')
      .eq('surge_account_id', account_id);

    if (businesses && businesses.length > 0) {
      for (const business of businesses) {
        await updateBusiness(business.id, {
          verification_status: mappedStatus,
          last_verification_error: error || details || null
        });
      }
      console.log(`[WEBHOOK] Updated ${businesses.length} business(es) with new status`);
    }

  } catch (error) {
    console.error('[WEBHOOK] Error handling verification update:', error);
  }
}

/**
 * Main webhook handler
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    
    // Verify signature using SURGE_WEBHOOK_SECRET
    const signingKey = process.env.SURGE_WEBHOOK_SECRET;
    const isValid = verifySignature(req.headers, rawBody, signingKey);
    
    if (!isValid) {
      console.error('[WEBHOOK] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse event
    const event = req.body;
    const eventType = event.type || event.event;

    console.log(`[WEBHOOK] Received event: ${eventType}`);

    // Route to appropriate handler
    if (eventType === 'message.received' || eventType === 'inbound') {
      await handleInbound(event);
    } else if (
      eventType === 'message.queued' ||
      eventType === 'message.sent' ||
      eventType === 'message.delivered' ||
      eventType === 'message.failed' ||
      eventType === 'delivery_status'
    ) {
      await handleDeliveryStatus(event);
    } else if (
      eventType === 'verification.updated' ||
      eventType === 'capability.updated' ||
      eventType === 'verification_status'
    ) {
      await handleVerificationUpdate(event);
    } else {
      console.log(`[WEBHOOK] Unhandled event type: ${eventType}`);
    }

    // Return 200 immediately
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    // Still return 200 to prevent retries for unrecoverable errors
    return res.status(200).json({ success: false, error: error.message });
  }
};
