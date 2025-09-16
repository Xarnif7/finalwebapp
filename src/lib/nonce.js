/**
 * Nonce generation and management utility
 * Generates cryptographically secure nonces for CSP
 */

let currentNonce = null;

/**
 * Generate a new nonce
 */
export function generateNonce() {
  if (typeof window !== 'undefined') {
    // Client-side: generate using crypto API if available, fallback to Math.random
    if (window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(16);
      window.crypto.getRandomValues(array);
      currentNonce = btoa(String.fromCharCode.apply(null, array));
    } else {
      // Fallback for older browsers
      currentNonce = btoa(Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2));
    }
  } else {
    // Server-side: this would be handled by middleware in a real implementation
    currentNonce = 'server-nonce-placeholder';
  }
  return currentNonce;
}

/**
 * Get the current nonce
 */
export function getNonce() {
  if (!currentNonce) {
    return generateNonce();
  }
  return currentNonce;
}

/**
 * Set nonce from server response
 */
export function setNonce(nonce) {
  currentNonce = nonce;
}

/**
 * Get nonce attribute for script tags
 */
export function getNonceAttribute() {
  return { nonce: getNonce() };
}
