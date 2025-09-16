/**
 * Removed base44 function adapters - using Supabase directly
 * All function operations now handled through Supabase client
 */
const _stub = (name) => async (..._args) => {
  console.warn(`[DEPRECATED] Function "${name}" no longer available - use Supabase directly`);
  return { ok: false, stub: true, name };
};

export const hello         = _stub("hello");
export const stripeWebhook = _stub("stripeWebhook");
export const sendSMS       = _stub("sendSMS");
export const sendRequest   = _stub("sendRequest");
