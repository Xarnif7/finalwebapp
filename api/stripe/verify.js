import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  res.setHeader('Cache-Control', 'no-store');
}

// Map Stripe price to plan tier
function getPlanTierFromPrice(price) {
  if (!price) return null;
  
  // Try to get from price ID first
  const priceId = price.id || '';
  if (priceId.includes('basic') || priceId.includes('standard')) return 'basic';
  if (priceId.includes('pro')) return 'pro';
  if (priceId.includes('enterprise')) return 'enterprise';
  
  // Try from nickname
  const nickname = price.nickname || '';
  if (nickname.toLowerCase().includes('basic') || nickname.toLowerCase().includes('standard')) return 'basic';
  if (nickname.toLowerCase().includes('pro')) return 'pro';
  if (nickname.toLowerCase().includes('enterprise')) return 'enterprise';
  
  return null;
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

    if (req.method !== 'GET') {
      setCorsHeaders(req, res);
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    // Validate environment variables
    const requiredEnvs = {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
    };

    const missingEnvs = Object.entries(requiredEnvs)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingEnvs.length > 0) {
      console.error('[VERIFY] Missing envs:', missingEnvs);
      setCorsHeaders(req, res);
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: `missing_env: ${missingEnvs.join(', ')}`,
        code: 'MISSING_ENV_VARS'
      }));
      return;
    }

    // Get session_id from query
    const { session_id } = req.query;
    if (!session_id) {
      setCorsHeaders(req, res);
      res.statusCode = 400;
      res.end(JSON.stringify({
        error: 'Missing session_id parameter',
        code: 'MISSING_SESSION_ID'
      }));
      return;
    }

    console.log('[VERIFY] Verifying session:', session_id);

    try {
      // Retrieve the checkout session with expanded data
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['subscription', 'line_items.data.price', 'customer']
      });

      console.log('[VERIFY] Session retrieved:', {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        hasSubscription: !!session.subscription,
        hasCustomer: !!session.customer
      });

      // Check if payment is complete
      if (session.payment_status !== 'paid' || session.status !== 'complete') {
        console.log('[VERIFY] Payment not complete yet');
        setCorsHeaders(req, res);
        res.statusCode = 202;
        res.end(JSON.stringify({
          ok: false,
          reason: 'pending',
          status: session.status,
          payment_status: session.payment_status
        }));
        return;
      }

      // Get subscription data
      const subscription = session.subscription;
      if (!subscription) {
        console.error('[VERIFY] No subscription found in session');
        setCorsHeaders(req, res);
        res.statusCode = 400;
        res.end(JSON.stringify({
          error: 'No subscription found in session',
          code: 'NO_SUBSCRIPTION'
        }));
        return;
      }

      // Determine user_id
      let userId = session.metadata?.user_id;
      if (!userId && session.customer_details?.email) {
        // Fallback: look up user by email
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', session.customer_details.email)
            .single();
          
          if (!error && profile) {
            userId = profile.id;
            console.log('[VERIFY] Found user by email:', userId);
          }
        } catch (emailError) {
          console.error('[VERIFY] Error looking up user by email:', emailError);
        }
      }

      if (!userId) {
        console.error('[VERIFY] No user_id found in metadata or customer details');
        setCorsHeaders(req, res);
        res.statusCode = 400;
        res.end(JSON.stringify({
          error: 'No user_id found',
          code: 'NO_USER_ID'
        }));
        return;
      }

      // Determine plan tier
      let planTier = session.metadata?.plan_tier;
      if (!planTier && session.line_items?.data?.[0]?.price) {
        planTier = getPlanTierFromPrice(session.line_items.data[0].price);
      }

      if (!planTier) {
        console.error('[VERIFY] Could not determine plan tier');
        setCorsHeaders(req, res);
        res.statusCode = 400;
        res.end(JSON.stringify({
          error: 'Could not determine plan tier',
          code: 'UNKNOWN_PLAN_TIER'
        }));
        return;
      }

      console.log('[VERIFY] Upserting subscription:', {
        session_id,
        user_id: userId,
        plan_tier: planTier,
        subscription_status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
      });

      // Upsert subscription to Supabase using service role with robust fallback
      let dbSuccess = false;
      try {
        // First try upsert with onConflict
        const { data, error } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            plan_tier: planTier,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('[VERIFY] Upsert failed, trying select-then-update/insert:', error);
          
          // Fallback: select by user_id, then update or insert
          const { data: existing, error: selectError } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', userId)
            .single();
          
          if (selectError && selectError.code !== 'PGRST116') {
            console.error('[VERIFY] Select error:', selectError);
          } else if (existing) {
            // Update existing
            const { error: updateError } = await supabase
              .from('subscriptions')
              .update({
                stripe_subscription_id: subscription.id,
                plan_tier: planTier,
                status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              })
              .eq('user_id', userId);
            
            if (updateError) {
              console.error('[VERIFY] Update error:', updateError);
            } else {
              console.log('[VERIFY] Subscription updated successfully');
              dbSuccess = true;
            }
          } else {
            // Insert new
            const { error: insertError } = await supabase
              .from('subscriptions')
              .insert({
                user_id: userId,
                stripe_subscription_id: subscription.id,
                plan_tier: planTier,
                status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              });
            
            if (insertError) {
              console.error('[VERIFY] Insert error:', insertError);
            } else {
              console.log('[VERIFY] Subscription inserted successfully');
              dbSuccess = true;
            }
          }
        } else {
          console.log('[VERIFY] Subscription upserted successfully, rows affected:', data?.length || 0);
          dbSuccess = true;
        }
      } catch (dbError) {
        console.error('[VERIFY] Database error:', dbError);
      }

      // Log one compact object once per request
      console.log('[VERIFY] Final result:', {
        session_id,
        user_id: userId,
        plan_tier: planTier,
        sub_status: subscription.status,
        db_success: dbSuccess,
        cookie_set: true
      });

      // Ensure a profiles row exists for the user (create if missing)
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email: session.customer_details?.email || '',
            onboarding_completed: false
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('[VERIFY] Error ensuring profile exists:', profileError);
        } else {
          console.log('[VERIFY] Profile ensured for user:', userId);
        }
      } catch (profileError) {
        console.error('[VERIFY] Error with profile upsert:', profileError);
      }

      // Set user-scoped cookie to grant temporary access while DB propagates
      const userScopedCookie = `sub_granted_uid=${userId}; Max-Age=600; Path=/; SameSite=Lax; Secure`;
      const clearLegacyCookie = 'sub_granted=; Max-Age=0; Path=/; SameSite=Lax; Secure';
      res.setHeader('Set-Cookie', [userScopedCookie, clearLegacyCookie]);

      // Always return success if payment is complete
      setCorsHeaders(req, res);
      res.statusCode = 200;
      res.end(JSON.stringify({
        ok: true,
        status: subscription.status,
        plan_tier: planTier,
        db_success: dbSuccess
      }));

    } catch (stripeError) {
      console.error('[VERIFY] Stripe error:', stripeError);
      setCorsHeaders(req, res);
      res.statusCode = 400;
      res.end(JSON.stringify({
        error: 'Invalid session',
        code: 'INVALID_SESSION',
        details: stripeError.message
      }));
    }

  } catch (error) {
    console.error('[VERIFY] Unhandled error:', error);
    setCorsHeaders(req, res);
    res.statusCode = 500;
    res.end(JSON.stringify({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    }));
  }
}
