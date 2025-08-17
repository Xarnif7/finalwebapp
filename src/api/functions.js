/**
 * Safe Base44 function adapters for non-Base44 deployments (Vercel).
 * We avoid dereferencing window.base44.functions at module load.
 * If a function is missing, we return a stub that resolves safely.
 */
const _b44f = (typeof window !== "undefined" && window.base44 && window.base44.functions)
  ? window.base44.functions
  : {};

const _stub = (name) => async (..._args) => {
  try { console.warn(`[base44] function "\${name}" unavailable in this deployment`); } catch {}
  // Return something harmless so callers don't explode on undefined
  return { ok: false, stub: true, name };
};

export const hello         = _b44f.hello         ?? _stub("hello");
export const stripeWebhook = _b44f.stripeWebhook ?? _stub("stripeWebhook");
export const sendSMS       = _b44f.sendSMS       ?? _stub("sendSMS");
export const sendRequest   = _b44f.sendRequest   ?? _stub("sendRequest");
