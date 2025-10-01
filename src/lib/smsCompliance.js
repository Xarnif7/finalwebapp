/**
 * SMS Compliance Utilities
 * Ensures all SMS messages meet compliance requirements
 */

const COMPLIANCE_FOOTER = 'Reply STOP to opt out, HELP for help.';
const STOP_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
const HELP_KEYWORDS = ['HELP', 'INFO', 'SUPPORT'];

/**
 * Ensure message has compliance footer
 * Adds footer if not already present
 */
export function ensureFooter(message) {
  if (!message) return COMPLIANCE_FOOTER;
  
  const lowerMessage = message.toLowerCase();
  
  // Check if message already has the footer or similar compliance text
  if (
    lowerMessage.includes('reply stop') ||
    lowerMessage.includes('text stop') ||
    lowerMessage.includes('send stop')
  ) {
    return message;
  }
  
  // Add footer with proper spacing
  return `${message.trim()} ${COMPLIANCE_FOOTER}`;
}

/**
 * Check if message is a STOP keyword
 */
export function isStopKeyword(message) {
  if (!message) return false;
  
  const cleaned = message.trim().toUpperCase();
  return STOP_KEYWORDS.includes(cleaned);
}

/**
 * Check if message is a HELP keyword
 */
export function isHelpKeyword(message) {
  if (!message) return false;
  
  const cleaned = message.trim().toUpperCase();
  return HELP_KEYWORDS.includes(cleaned);
}

/**
 * Get auto-reply for STOP keyword
 */
export function getStopReply(brandName = 'Blipp') {
  return `You've been unsubscribed from ${brandName} SMS. You will not receive further messages. Reply START to resubscribe.`;
}

/**
 * Get auto-reply for HELP keyword
 */
export function getHelpReply(brandName = 'Blipp') {
  return `${brandName} SMS Support: For help, contact us at support@myblipp.com. Reply STOP to unsubscribe. Msg & data rates may apply.`;
}
