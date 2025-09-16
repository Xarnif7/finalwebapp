/**
 * Content Security Policy configuration
 * Defines allowed sources for various resource types
 */

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    'https://*.supabase.co',
    'https://*.supabase.in',
    'https://accounts.google.com',
    'https://www.gstatic.com',
    'https://www.google.com',
    'https://vercel.live',
    'https://va.vercel-scripts.com',
    'https://js.stripe.com'
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for dynamic styles
    'https://fonts.googleapis.com'
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com'
  ],
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'blob:'
  ],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'https://api.stripe.com',
    'https://accounts.google.com',
    'https://www.googleapis.com',
    'https://vercel.live',
    'https://va.vercel-scripts.com',
    'https://base44.app'
  ],
  'frame-src': [
    "'self'",
    'https://js.stripe.com',
    'https://accounts.google.com'
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
};

/**
 * Generate CSP header string
 */
export function generateCSPHeader(nonce = null) {
  const directives = { ...CSP_DIRECTIVES };
  
  // Add nonce to script-src if provided
  if (nonce) {
    directives['script-src'].push(`'nonce-${nonce}'`);
  }
  
  return Object.entries(directives)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
