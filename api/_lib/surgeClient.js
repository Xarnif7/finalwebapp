/**
 * Surge SMS Client
 * Handles all Surge API interactions with subaccount support
 */

const crypto = require('crypto');

const SURGE_API_KEY = process.env.SURGE_API_KEY;
const SURGE_WEBHOOK_SECRET = process.env.SURGE_WEBHOOK_SECRET;
const SURGE_MASTER_ACCOUNT_ID = process.env.SURGE_MASTER_ACCOUNT_ID;
const SURGE_API_BASE = process.env.SURGE_API_BASE || 'https://api.surge.app';
const SURGE_USE_SUBACCOUNTS = process.env.SURGE_USE_SUBACCOUNTS === 'true';

/**
 * Create account for business
 * If SURGE_USE_SUBACCOUNTS=false, returns master account ID
 * If SURGE_USE_SUBACCOUNTS=true, creates subaccount via Surge API
 */
async function createAccountForBusiness({ name, brand_name, organization, time_zone }) {
  if (!SURGE_USE_SUBACCOUNTS) {
    if (!SURGE_MASTER_ACCOUNT_ID) {
      throw new Error('SURGE_MASTER_ACCOUNT_ID not configured');
    }
    console.log('[SURGE] Using master account for business:', name);
    return { accountId: SURGE_MASTER_ACCOUNT_ID };
  }

  if (!SURGE_API_KEY) {
    throw new Error('SURGE_API_KEY not configured');
  }

  try {
    console.log('[SURGE] Creating subaccount for business:', name);
    
    const response = await fetch(`${SURGE_API_BASE}/accounts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SURGE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name,
        brand_name: brand_name,
        organization: organization,
        time_zone: time_zone
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[SURGE] Error creating subaccount:', data);
      throw new Error(data.message || data.error || 'Failed to create subaccount');
    }
    
    console.log('[SURGE] Subaccount created successfully:', data.id);
    return { accountId: data.id };
  } catch (error) {
    console.error('[SURGE] Error creating subaccount:', error);
    throw new Error(`Failed to create subaccount: ${error.message}`);
  }
}

/**
 * Purchase toll-free number via Surge API
 */
async function purchaseTollFreeNumber({ accountId }) {
  try {
    console.log('[SURGE] Purchasing toll-free number for account:', accountId);
    
    if (!SURGE_API_KEY) {
      throw new Error('SURGE_API_KEY not configured');
    }
    
    const response = await fetch(`${SURGE_API_BASE}/accounts/${accountId}/phone_numbers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SURGE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'toll_free'
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[SURGE] TFN purchase failed:', data);
      const errorMsg = data?.error?.message || data?.message || data?.error || 'Unknown error';
      throw new Error(errorMsg);
    }
    
    console.log('[SURGE] TFN purchased successfully:', data.number);
    
    return {
      phoneId: data.id,
      e164: data.number
    };
  } catch (error) {
    console.error('[SURGE] Error purchasing TFN:', error);
    throw error;
  }
}

/**
 * Submit TFN verification via Surge Campaign API
 */
async function submitTfnVerification({ accountId, payload }) {
  try {
    console.log('[SURGE] Creating campaign for account:', accountId);
    
    if (!SURGE_API_KEY) {
      throw new Error('SURGE_API_KEY not configured');
    }
    
    const { 
      legal_name, 
      website, 
      address, 
      ein_or_sole_prop, 
      contact_name, 
      contact_email, 
      contact_phone,
      opt_in_method, 
      opt_in_evidence_url,
      terms_url, 
      privacy_url, 
      estimated_monthly_volume,
      time_zone
    } = payload;
    
    // Build use case categories
    const use_case_categories = ['account_notifications', 'customer_care', 'two_way_conversational'];
    
    // Build use case summary
    const use_case_summary = `${legal_name} uses SMS to communicate with customers about appointments, orders, and account updates. Messages include booking confirmations, order status updates, and important account notifications. All messages include clear opt-out instructions and comply with TCPA regulations.`;
    
    // Generate sample messages with STOP/HELP footer
    const sample_messages = [
      `You are now opted in to messages from ${legal_name}. Frequency varies. Msg&data rates apply. Reply STOP to opt out, HELP for help.`,
      `Hi! This is ${legal_name}. Your appointment is confirmed for tomorrow at 2 PM. Reply STOP to opt out, HELP for help. Msg & data rates may apply.`
    ];
    
    const response = await fetch(`${SURGE_API_BASE}/accounts/${accountId}/campaigns`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SURGE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        brand_name: legal_name,
        use_case_categories: use_case_categories,
        use_case_summary: use_case_summary,
        sample_messages: sample_messages,
        opt_in_method: opt_in_method,
        opt_in_evidence_url: opt_in_evidence_url,
        terms_url: terms_url,
        privacy_url: privacy_url,
        estimated_monthly_volume: estimated_monthly_volume,
        organization: {
          name: legal_name,
          website: website,
          address: address,
          ein: ein_or_sole_prop,
          contact: {
            name: contact_name,
            email: contact_email,
            phone: contact_phone
          }
        }
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[SURGE] Error creating campaign:', data);
      throw new Error(data.message || data.error || 'Failed to create campaign');
    }
    
    console.log('[SURGE] Campaign created successfully:', data.id);
    
    return {
      verificationId: data.id,
      status: 'pending'
    };
  } catch (error) {
    console.error('[SURGE] Error submitting verification:', error);
    throw new Error(`Failed to submit TFN verification: ${error.message}`);
  }
}

/**
 * Get account capability status via Surge API
 */
async function getCapabilityStatus({ accountId }) {
  try {
    console.log('[SURGE] Checking capability status for account:', accountId);
    
    if (!SURGE_API_KEY) {
      throw new Error('SURGE_API_KEY not configured');
    }
    
    const response = await fetch(
      `${SURGE_API_BASE}/accounts/${accountId}/status?capabilities=toll_free_messaging`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SURGE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[SURGE] Error getting status:', data);
      throw new Error(data.message || data.error || 'Failed to get status');
    }
    
    console.log('[SURGE] Account status:', data);
    
    // Map Surge capability status to our enum
    const tollFreeStatus = data.capabilities?.toll_free_messaging?.status;
    let mappedStatus = 'pending';
    
    if (tollFreeStatus === 'active' || tollFreeStatus === 'approved') {
      mappedStatus = 'active';
    } else if (tollFreeStatus === 'rejected' || tollFreeStatus === 'disabled') {
      mappedStatus = 'disabled';
    } else if (tollFreeStatus === 'action_required' || tollFreeStatus === 'incomplete') {
      mappedStatus = 'action_needed';
    }
    
    return {
      status: mappedStatus,
      details: data.capabilities?.toll_free_messaging?.message || null
    };
  } catch (error) {
    console.error('[SURGE] Error getting capability status:', error);
    throw new Error(`Failed to get capability status: ${error.message}`);
  }
}

/**
 * Send SMS message via Surge API
 */
async function sendMessage({ accountId, from, to, body }) {
  try {
    console.log(`[SURGE] Sending SMS from ${from} to ${to.substring(0, 8)}****`);
    
    if (!SURGE_API_KEY) {
      throw new Error('SURGE_API_KEY not configured');
    }
    
    const response = await fetch(`${SURGE_API_BASE}/accounts/${accountId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SURGE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        body: body,
        conversation: {
          contact: {
            phone_number: to
          }
        },
        metadata: {
          from_number: from
        }
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[SURGE] Error response:', JSON.stringify(data, null, 2));
      const errorMessage = data.message || data.error || JSON.stringify(data) || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }
    
    console.log('[SURGE] Message sent successfully:', data.id);
    
    return {
      messageId: data.id,
      status: data.status || 'queued'
    };
  } catch (error) {
    console.error('[SURGE] Error sending message:', error);
    throw error;
  }
}

/**
 * Verify Surge webhook signature
 * Based on Surge's HMAC-SHA256 signature scheme
 */
function verifySignature(headers, rawBody, signingKey) {
  const signature = headers['x-surge-signature'] || headers['X-Surge-Signature'];
  
  if (!signature || !signingKey) {
    console.warn('[SURGE] Missing signature or signing key - rejecting webhook');
    return false;
  }
  
  try {
    // Surge signature format: "t=timestamp,v1=signature"
    const [timestampPart, signaturePart] = signature.split(',');
    
    if (!timestampPart || !signaturePart) {
      console.error('[SURGE] Invalid signature format');
      return false;
    }
    
    const timestamp = timestampPart.split('=')[1];
    const receivedSignature = signaturePart.split('=')[1];
    
    // Create the signed payload: timestamp.rawBody
    const signedPayload = `${timestamp}.${rawBody}`;
    
    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', signingKey)
      .update(signedPayload)
      .digest('hex');
    
    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature)
    );
    
    if (!isValid) {
      console.error('[SURGE] Signature verification failed');
      return false;
    }
    
    console.log('[SURGE] Webhook signature verified successfully');
    return true;
  } catch (error) {
    console.error('[SURGE] Error verifying signature:', error);
    return false;
  }
}

module.exports = {
  createAccountForBusiness,
  purchaseTollFreeNumber,
  submitTfnVerification,
  getCapabilityStatus,
  sendMessage,
  verifySignature
};
