/**
 * Phone Number Utilities (Frontend)
 */

/**
 * Normalize phone number to E.164 format
 */
export function normalizeToE164(phoneNumber) {
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
export function isLikelyE164(phoneNumber) {
  if (!phoneNumber) return false;
  
  // E.164: starts with +, followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Format phone number for display (US format)
 */
export function formatPhoneDisplay(phoneNumber) {
  if (!phoneNumber) return '';
  
  // Remove non-digits
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX for 10-digit US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Format as +X (XXX) XXX-XXXX for 11-digit numbers starting with 1
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  // Return as-is for other formats
  return phoneNumber;
}
