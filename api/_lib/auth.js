/**
 * Auth helpers: requireOwner
 */

const { supabase } = require('./db');

function maskPhone(phone) {
  if (!phone) return '';
  const last4 = phone.slice(-4);
  return `${phone.substring(0, 4)}****${last4}`;
}

/**
 * Ensure the bearer token belongs to a user who owns the given businessId.
 * Returns the user profile on success; throws an Error with status on failure.
 */
async function requireOwner(req, businessId) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Authorization header required');
    err.statusCode = 401;
    throw err;
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    const err = new Error('Invalid token');
    err.statusCode = 401;
    throw err;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.business_id !== businessId) {
    const err = new Error('Forbidden: business ownership mismatch');
    err.statusCode = 403;
    throw err;
  }

  return { user, profile };
}

module.exports = {
  requireOwner,
  maskPhone,
};


