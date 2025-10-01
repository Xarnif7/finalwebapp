/**
 * Surge SMS Client
 * Handles all Surge API interactions
 */

const crypto = require('crypto');

const SURGE_API_KEY = process.env.SURGE_API_KEY;
const SURGE_ACCOUNT_ID = process.env.SURGE_ACCOUNT_ID;
const SURGE_SIGNING_KEY = process.env.SURGE_SIGNING_KEY;
const SURGE_API_BASE = process.env.SURGE_API_BASE || 'https://api.surge.app';
const SURGE_USE_SUBACCOUNTS = process.env.SURGE_USE_SUBACCOUNTS === 'true';

/**
 * Create or get account for business
 * Uses SURGE_ACCOUNT_ID from environment
 * TODO: Implement real subaccount creation when SURGE_USE_SUBACCOUNTS=true
 */
async function createOrGetAccountForBusiness(business) {
  if (!SURGE_ACCOUNT_ID) {
    throw new Error('SURGE_ACCOUNT_ID not configured');
  }
  
  if (!SURGE_USE_SUBACCOUNTS) {
    // Use the main Surge account ID from environment
    console.log('[SURGE] Using main account for business:', business.id);
    return { accountId: SURGE_ACCOUNT_ID };
  }
  
  // TODO: Implement subaccount creation via Surge API
  // For now, return main account
  console.log('[SURGE] TODO: Implement subaccount creation for business:', business.id);
  return { accountId: SURGE_ACCOUNT_ID };
}

/**
 * Purchase toll-free number via Surge API
 */
async function purchaseTollFreeNumber(accountId) {
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
    
    console.log('[SURGE] Purchase TFN response status:', response.status);
    console.log('[SURGE] Purchase TFN response ok:', response.ok);
    
    const responseText = await response.text();
    console.log('[SURGE] Purchase TFN raw response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('[SURGE] Could not parse JSON response');
      throw new Error(`Surge API error: HTTP ${response.status} - ${responseText}`);
    }
    
    console.log('[SURGE] Purchase TFN parsed data:', JSON.stringify(data));
    
    if (!response.ok) {
      console.error('[SURGE] TFN purchase failed with status:', response.status);
      console.error('[SURGE] Error data:', data);
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
    throw error; // Re-throw with full details
  }
}

/**
 * Submit TFN verification via Surge Campaign API
 */
async function submitTfnVerification(accountId, payload) {
  try {
    console.log('[SURGE] Creating campaign for account:', accountId);
    
    if (!SURGE_API_KEY) {
      throw new Error('SURGE_API_KEY not configured');
    }
    
    const { legal_name, website, address, ein_or_sole_prop, contact_name, contact_email, opt_in_method, terms_url, privacy_url } = payload;
    
    // Generate sample messages with brand name and compliance footer
    const sampleMessages = [
      `You are now opted in to messages from ${legal_name}. Frequency varies. Msg&data rates apply. Reply STOP to opt out.`,
      `Hi! This is ${legal_name}. Your appointment is confirmed for tomorrow at 2 PM. Reply STOP to opt out, HELP for help. Msg & data rates may apply.`,
      `Thanks for choosing ${legal_name}! Your order #12345 is ready for pickup. Reply STOP to opt out, HELP for help. Msg & data rates may apply.`
    ];
    
    // Build consent flow description
    const consentFlow = `Customers opt in through ${opt_in_method || 'our website form'}. ` +
      `The opt-in form is located at ${website || terms_url} and clearly explains what messages they will receive. ` +
      `We collect explicit consent before sending any messages.`;
    
    // Build campaign description
    const description = `${legal_name} uses SMS to communicate with customers about appointments, orders, and account updates. ` +
      `Messages include booking confirmations, order status updates, and important account notifications. ` +
      `All messages include clear opt-out instructions and comply with TCPA regulations.`;
    
    const response = await fetch(`${SURGE_API_BASE}/accounts/${accountId}/campaigns`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SURGE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: description,
        consent_flow: consentFlow,
        message_samples: sampleMessages,
        use_cases: ['account_notification', 'customer_care', 'delivery_notification'],
        volume: 'low',
        privacy_policy_url: privacy_url || 'https://myblipp.com/privacy',
        terms_and_conditions_url: terms_url || 'https://myblipp.com/terms',
        includes: ['links']
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
      status: 'pending' // Campaign starts as pending verification
    };
  } catch (error) {
    console.error('[SURGE] Error submitting verification:', error);
    throw new Error(`Failed to submit TFN verification: ${error.message}`);
  }
}

/**
 * Get account capability status via Surge API
 */
async function getCapabilityStatus(accountId) {
  try {
    console.log('[SURGE] Checking capability status for account:', accountId);
    
    if (!SURGE_API_KEY) {
      throw new Error('SURGE_API_KEY not configured');
    }
    
    // Check account status with capabilities parameter
    const response = await fetch(
      `${SURGE_API_BASE}/accounts/${accountId}/status?capabilities=local_messaging&capabilities=toll_free_messaging`,
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
    
    // Surge API format - using accounts/{account_id}/messages endpoint
    // Note: For now we're using the API key's account, not subaccounts
    const accountPath = SURGE_API_KEY ? 'me' : accountId; // Use 'me' with API key auth
    
    const response = await fetch(`${SURGE_API_BASE}/accounts/${accountPath}/messages`, {
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
    
    // Parse response
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      const text = await response.text();
      console.error('[SURGE] Non-JSON response:', response.status, text);
      throw new Error(`Surge API error: HTTP ${response.status} - ${text}`);
    }
    
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
    throw error; // Re-throw the original error with full details
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
  createOrGetAccountForBusiness,
  purchaseTollFreeNumber,
  submitTfnVerification,
  getCapabilityStatus,
  sendMessage,
  verifySignature
};
