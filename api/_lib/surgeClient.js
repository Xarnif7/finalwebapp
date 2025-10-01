/**
 * Surge SMS Client
 * Handles all Surge API interactions
 */

const crypto = require('crypto');

const SURGE_API_KEY = process.env.SURGE_API_KEY;
const SURGE_SIGNING_KEY = process.env.SURGE_SIGNING_KEY;
const SURGE_API_BASE = process.env.SURGE_API_BASE || 'https://api.surge.app';
const SURGE_USE_SUBACCOUNTS = process.env.SURGE_USE_SUBACCOUNTS === 'true';

/**
 * Create or get account for business
 * TODO: Implement real subaccount creation when SURGE_USE_SUBACCOUNTS=true
 */
async function createOrGetAccountForBusiness(business) {
  if (!SURGE_USE_SUBACCOUNTS) {
    // For now, return a sentinel value indicating we use the master account
    return { accountId: 'master' };
  }
  
  // TODO: Implement subaccount creation via Surge API
  // For now, return master account
  console.log('[SURGE] TODO: Implement subaccount creation for business:', business.id);
  return { accountId: 'master' };
}

/**
 * Purchase toll-free number
 * TODO: Implement actual TFN purchase via Surge API
 */
async function purchaseTollFreeNumber(accountId) {
  try {
    console.log('[SURGE] Purchasing toll-free number for account:', accountId);
    
    // TODO: Replace with actual Surge API call
    // Example endpoint (check Surge docs): POST /v1/phone-numbers/available?type=toll-free
    // Then: POST /v1/phone-numbers to purchase
    
    // For now, return a mock TFN for testing
    const mockPhoneId = `PN${Date.now()}`;
    const mockE164 = `+1${Math.floor(8000000000 + Math.random() * 999999999)}`;
    
    console.log('[SURGE] TODO: Implement actual TFN purchase via Surge API');
    console.log('[SURGE] Mock TFN generated:', mockE164);
    
    return {
      phoneId: mockPhoneId,
      e164: mockE164
    };
  } catch (error) {
    console.error('[SURGE] Error purchasing TFN:', error);
    throw new Error(`Failed to purchase toll-free number: ${error.message}`);
  }
}

/**
 * Submit TFN verification to Surge
 * TODO: Implement actual verification submission via Surge API
 */
async function submitTfnVerification(accountId, payload) {
  try {
    console.log('[SURGE] Submitting TFN verification for account:', accountId);
    
    const { legal_name, website, address, ein_or_sole_prop, contact_name, contact_email, opt_in_method, terms_url, privacy_url } = payload;
    
    // Generate two sample messages with brand name and compliance footer
    const sampleMessages = [
      `Hi! This is ${legal_name}. Your appointment is confirmed for tomorrow at 2 PM. Reply STOP to opt out, HELP for help. Msg & data rates may apply.`,
      `Thanks for choosing ${legal_name}! Your order #12345 is ready for pickup. Reply STOP to opt out, HELP for help. Msg & data rates may apply.`
    ];
    
    // TODO: Replace with actual Surge API call for verification
    // Example endpoint (check Surge docs): POST /v1/verifications
    const verificationData = {
      business_name: legal_name,
      website,
      address,
      ein_or_tax_id: ein_or_sole_prop,
      contact: {
        name: contact_name,
        email: contact_email
      },
      opt_in_method,
      terms_url,
      privacy_url,
      sample_messages: sampleMessages
    };
    
    console.log('[SURGE] TODO: Implement actual verification submission via Surge API');
    console.log('[SURGE] Verification data prepared:', { ...verificationData, sample_messages: '[2 messages]' });
    
    // Mock response for testing
    const mockVerificationId = `VER${Date.now()}`;
    
    return {
      verificationId: mockVerificationId,
      status: 'pending'
    };
  } catch (error) {
    console.error('[SURGE] Error submitting verification:', error);
    throw new Error(`Failed to submit TFN verification: ${error.message}`);
  }
}

/**
 * Get capability/verification status
 * TODO: Implement actual status check via Surge API
 */
async function getCapabilityStatus(accountId) {
  try {
    console.log('[SURGE] Checking capability status for account:', accountId);
    
    // TODO: Replace with actual Surge API call
    // Example endpoint (check Surge docs): GET /v1/capabilities or /v1/verifications/{id}
    
    console.log('[SURGE] TODO: Implement actual status check via Surge API');
    
    // Mock response - return pending for now
    return {
      status: 'pending',
      details: 'Verification is being reviewed by Surge'
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
