/**
 * Phone Number Utilities (Server-side)
 */

/**
 * Normalize phone number to E.164 format
 */
function normalizeToE164(phoneNumber) {
  if (!phoneNumber) return null;
  
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it's 10 digits, assume US and add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If it's 11 digits starting with 1, add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // If it already has country code, ensure + prefix
  if (cleaned.length > 10 && !cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  // If it already starts with +, return as-is
  if (phoneNumber.startsWith('+')) {
    return phoneNumber.replace(/\D/g, '').replace(/^(\d)/, '+$1');
  }
  
  return null;
}

/**
 * Check if phone number looks like E.164 format
 */
function isLikelyE164(phoneNumber) {
  if (!phoneNumber) return false;
  
  // E.164: starts with +, followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Mask phone number for logging (show last 4 digits only)
 */
function maskPhoneNumber(phoneNumber) {
  if (!phoneNumber || phoneNumber.length < 4) {
    return '****';
  }
  return `****${phoneNumber.slice(-4)}`;
}

module.exports = {
  normalizeToE164,
  isLikelyE164,
  maskPhoneNumber
};
