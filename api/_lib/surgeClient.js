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
 * Send SMS message
 */
async function sendMessage({ accountId, from, to, body }) {
  try {
    console.log(`[SURGE] Sending SMS from ${from} to ${to.substring(0, 8)}****`);
    
    if (!SURGE_API_KEY) {
      throw new Error('SURGE_API_KEY not configured');
    }
    
    const response = await fetch(`${SURGE_API_BASE}/v1/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SURGE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to,
        body
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[SURGE] Error response:', data);
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    
    console.log('[SURGE] Message sent successfully:', data.id);
    
    return {
      messageId: data.id,
      status: data.status || 'queued'
    };
  } catch (error) {
    console.error('[SURGE] Error sending message:', error.message);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
}

/**
 * Verify Surge webhook signature
 * TODO: Implement actual signature verification when Surge provides specs
 */
function verifySignature(headers, rawBody, signingKey) {
  // TODO: Implement actual Surge signature verification
  // This is a placeholder that returns true for now
  // When implementing, use crypto.createHmac with the signing key
  
  console.log('[SURGE] TODO: Implement actual webhook signature verification');
  console.log('[SURGE] Webhook signature verification - currently accepting all (INSECURE)');
  
  // Placeholder implementation
  const signature = headers['x-surge-signature'] || headers['X-Surge-Signature'];
  
  if (!signature || !signingKey) {
    console.warn('[SURGE] Missing signature or signing key');
    return true; // Return true for now during development
  }
  
  // TODO: Implement proper HMAC verification
  // Example (adjust based on Surge's actual signature scheme):
  // const expectedSignature = crypto
  //   .createHmac('sha256', signingKey)
  //   .update(rawBody)
  //   .digest('hex');
  // return crypto.timingSafeEqual(
  //   Buffer.from(signature),
  //   Buffer.from(expectedSignature)
  // );
  
  return true; // Placeholder - accept all for now
}

module.exports = {
  createOrGetAccountForBusiness,
  purchaseTollFreeNumber,
  submitTfnVerification,
  getCapabilityStatus,
  sendMessage,
  verifySignature
};
