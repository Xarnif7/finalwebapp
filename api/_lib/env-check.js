/**
 * Environment variable validation
 * Checks for required env vars and warns about missing ones
 */

const requiredEnvVars = [
  'SURGE_API_KEY',
  'SURGE_WEBHOOK_SECRET', 
  'SURGE_API_BASE',
  'APP_BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const optionalEnvVars = [
  'SURGE_USE_SUBACCOUNTS',
  'SURGE_MASTER_ACCOUNT_ID',
  'SURGE_MAX_NUMBERS',
  'CRON_SECRET',
  'ADMIN_TOKEN'
];

function checkEnvironment() {
  const missing = [];
  const warnings = [];

  // Check required vars
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check optional vars that might be needed
  if (process.env.SURGE_USE_SUBACCOUNTS === 'false' && !process.env.SURGE_MASTER_ACCOUNT_ID) {
    warnings.push('SURGE_MASTER_ACCOUNT_ID is required when SURGE_USE_SUBACCOUNTS=false');
  }

  if (process.env.SURGE_MAX_NUMBERS && isNaN(parseInt(process.env.SURGE_MAX_NUMBERS))) {
    warnings.push('SURGE_MAX_NUMBERS must be a valid integer');
  }

  // Log results
  if (missing.length > 0) {
    console.error('[ENV] Missing required environment variables:', missing.join(', '));
    console.error('[ENV] Please set these variables in your .env file or deployment environment');
  }

  if (warnings.length > 0) {
    console.warn('[ENV] Environment warnings:', warnings.join(', '));
  }

  if (missing.length === 0 && warnings.length === 0) {
    console.log('[ENV] All environment variables are properly configured');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}

module.exports = {
  checkEnvironment,
  requiredEnvVars,
  optionalEnvVars
};
