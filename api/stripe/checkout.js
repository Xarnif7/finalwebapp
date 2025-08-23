import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe and Supabase clients
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const supabase = process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Set CORS headers based on request origin
function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin.includes('localhost:5173')
    ? 'http://localhost:5173'
    : 'https://myblipp.com';
  
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Content-Type', 'application/json');
}

// Diagnostics function
async function getDiagnostics(req, res) {
  setCorsHeaders(req, res);
  
  try {
    // Check environment variables
    const envs = {
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      APP_BASE_URL: !!process.env.APP_BASE_URL,
      STRIPE_PRICE_BASIC: !!process.env.STRIPE_PRICE_BASIC,
      STRIPE_PRICE_PRO: !!process.env.STRIPE_PRICE_PRO,
      STRIPE_PRICE_ENTERPRISE: !!process.env.STRIPE_PRICE_ENTERPRISE,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL
    };

    // Determine Stripe mode
    const mode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live';

    // Check price retrieval
    const prices = {};
    if (stripe && process.env.STRIPE_PRICE_BASIC) {
      try {
        const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_BASIC);
        prices.BASIC = { ok: true, id: price.id, product: price.product };
      } catch (error) {
        prices.BASIC = { ok: false, error: error.message };
      }
    } else {
      prices.BASIC = { ok: false, error: 'No Stripe client or price ID' };
    }

    if (stripe && process.env.STRIPE_PRICE_PRO) {
      try {
        const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_PRO);
        prices.PRO = { ok: true, id: price.id, product: price.product };
      } catch (error) {
        prices.PRO = { ok: false, error: error.message };
      }
    } else {
      prices.PRO = { ok: false, error: 'No Stripe client or price ID' };
    }

    if (stripe && process.env.STRIPE_PRICE_ENTERPRISE) {
      try {
        const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ENTERPRISE);
        prices.ENTERPRISE = { ok: true, id: price.id, product: price.product };
      } catch (error) {
        prices.ENTERPRISE = { ok: false, error: error.message };
      }
    } else {
      prices.ENTERPRISE = { ok: false, error: 'No Stripe client or price ID' };
    }

    // Check token presence
    const tokenPresent = !!(req.headers.authorization && req.headers.authorization.startsWith('Bearer '));

    res.statusCode = 200;
    res.end(JSON.stringify({
      mode,
      has: envs,
      prices,
      tokenPresent,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('[DIAGNOSTICS] Error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({
      error: 'Diagnostics failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }));
  }
}

export default async function handler(req, res) {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      setCorsHeaders(req, res);
      res.statusCode = 204;
      res.end();
      return;
    }

    // Handle GET diagnostics
    if (req.method === 'GET') {
      if (req.query.diag === '1' || req.url?.includes('?diag=1')) {
        return await getDiagnostics(req, res);
      }
      setCorsHeaders(req, res);
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'POST only' }));
      return;
    }

    // Handle POST checkout
    if (req.method !== 'POST') {
      setCorsHeaders(req, res);
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    // Validate environment variables
    const requiredEnvs = {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      APP_BASE_URL: process.env.APP_BASE_URL,
      STRIPE_PRICE_BASIC: process.env.STRIPE_PRICE_BASIC,
      STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO,
      STRIPE_PRICE_ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL
    };

    const missingEnvs = Object.entries(requiredEnvs)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingEnvs.length > 0) {
      console.error('[CHECKOUT] Missing envs:', missingEnvs);
      setCorsHeaders(req, res);
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: `missing_env: ${missingEnvs.join(', ')}`,
        code: 'MISSING_ENV_VARS'
      }));
      return;
    }

    // Check Stripe mode consistency
    const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
    const priceIds = [
      process.env.STRIPE_PRICE_BASIC,
      process.env.STRIPE_PRICE_PRO,
      process.env.STRIPE_PRICE_ENTERPRISE
    ];
    
    const hasLivePrice = priceIds.some(id => id && id.includes('live'));
    const hasTestPrice = priceIds.some(id => id && id.includes('test'));
    
    if ((isTestMode && hasLivePrice) || (!isTestMode && hasTestPrice)) {
      console.error('[CHECKOUT] Stripe mode mismatch');
      setCorsHeaders(req, res);
      res.statusCode = 400;
      res.end(JSON.stringify({
        error: 'stripe_mode_mismatch',
        code: 'STRIPE_MODE_MISMATCH'
      }));
      return;
    }

    // Validate request body
    const { planTier } = req.body || {};
    if (!planTier) {
      setCorsHeaders(req, res);
      res.statusCode = 400;
      res.end(JSON.stringify({
        error: 'Missing planTier in request body',
        code: 'MISSING_PLAN_TIER'
      }));
      return;
    }

    // Validate plan tier
    if (!['basic', 'pro', 'enterprise'].includes(planTier)) {
      setCorsHeaders(req, res);
      res.statusCode = 400;
      res.end(JSON.stringify({
        error: 'unknown_plan_tier',
        code: 'INVALID_PLAN_TIER'
      }));
      return;
    }

    // Validate authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[CHECKOUT] No auth header');
      setCorsHeaders(req, res);
      res.statusCode = 401;
      res.end(JSON.stringify({
        error: 'auth_required',
        code: 'NO_AUTH_HEADER'
      }));
      return;
    }

    // Verify user with Supabase
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[CHECKOUT] Auth error:', authError);
      setCorsHeaders(req, res);
      res.statusCode = 401;
      res.end(JSON.stringify({
        error: 'auth_required',
        code: 'INVALID_TOKEN'
      }));
      return;
    }

    console.log('[CHECKOUT] User verified:', { id: user.id, email: user.email });

    // Get or create Stripe customer
    let stripeCustomerId = null;
    try {
      // Check if user already has a Stripe customer ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('[CHECKOUT] Error fetching profile:', profileError);
        setCorsHeaders(req, res);
        res.statusCode = 500;
        res.end(JSON.stringify({
          error: 'Database error',
          code: 'DB_ERROR'
        }));
        return;
      }

      if (profile?.stripe_customer_id) {
        stripeCustomerId = profile.stripe_customer_id;
        console.log('[CHECKOUT] Using existing Stripe customer:', stripeCustomerId);
      } else {
        // Create new Stripe customer
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: user.id
          }
        });
        
        stripeCustomerId = customer.id;
        console.log('[CHECKOUT] Created new Stripe customer:', stripeCustomerId);

        // Save customer ID to profiles table
        const { error: updateError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            stripe_customer_id: stripeCustomerId
          }, {
            onConflict: 'id'
          });

        if (updateError) {
          console.error('[CHECKOUT] Error saving customer ID:', updateError);
          // Continue anyway - the checkout can proceed without saving the customer ID
        }
      }
    } catch (customerError) {
      console.error('[CHECKOUT] Error with Stripe customer:', customerError);
      setCorsHeaders(req, res);
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: 'Failed to create customer',
        code: 'CUSTOMER_ERROR'
      }));
      return;
    }

    // Map plan tier to price ID
    const priceMap = {
      basic: process.env.STRIPE_PRICE_BASIC,
      pro: process.env.STRIPE_PRICE_PRO,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE
    };

    const priceId = priceMap[planTier];
    if (!priceId) {
      setCorsHeaders(req, res);
      res.statusCode = 400;
      res.end(JSON.stringify({
        error: 'Price ID not found for plan tier',
        code: 'PRICE_NOT_FOUND'
      }));
      return;
    }

    // Log checkout attempt
    console.log('[CHECKOUT] Creating session:', {
      mode: isTestMode ? 'test' : 'live',
      planTier,
      priceId: priceId.substring(0, 8) + '...',
      userId: user.id,
      userEmail: user.email,
      stripeCustomerId
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.APP_BASE_URL}/post-checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_BASE_URL}/paywall`,
      metadata: {
        user_id: user.id,
        plan_tier: planTier
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_tier: planTier
        }
      }
    });

    console.log('[CHECKOUT] Session created:', {
      sessionId: session.id,
      userId: user.id,
      planTier,
      customerId: stripeCustomerId
    });

    setCorsHeaders(req, res);
    res.statusCode = 200;
    res.end(JSON.stringify({ url: session.url }));

  } catch (error) {
    console.error('[CHECKOUT] Unhandled error:', error);
    setCorsHeaders(req, res);
    res.statusCode = 500;
    res.end(JSON.stringify({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    }));
  }
}
