import crypto from 'crypto';

export default function handler(req, res) {
  // Generate a cryptographically random nonce for this request
  const nonce = crypto.randomBytes(16).toString('base64');
  
  // Create strict CSP header with nonce
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://*.supabase.co https://*.supabase.in https://accounts.google.com https://www.gstatic.com https://www.google.com https://vercel.live https://va.vercel-scripts.com https://js.stripe.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com https://accounts.google.com https://www.googleapis.com https://vercel.live https://va.vercel-scripts.com https://base44.app",
    "frame-src 'self' https://js.stripe.com https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Return CSP configuration and nonce
  res.status(200).json({ 
    csp: cspHeader,
    nonce,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    }
  });
}
