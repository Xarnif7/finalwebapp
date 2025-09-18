import express from 'express';
import cors from 'cors';
import path from 'path';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env file
dotenv.config({ path: '.env', debug: true });

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177'],
  credentials: true
}));
app.use(express.json());

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51RtYR7Fr7CPBk7jlcadsIjiuw8z1qSvrq0SWJYkRwDRE1rpI1CctOOaPwLXgkq2Q0pRaPGt0f7tIwBFisOurg0PA00b5iOOwkR';
console.log('[SERVER] Stripe secret key found:', stripeSecretKey ? 'Yes' : 'No');

if (!stripeSecretKey) {
  console.error('[SERVER] STRIPE_SECRET_KEY is missing from environment variables');
  process.exit(1);
}

const stripe = Stripe(stripeSecretKey);

// Initialize Supabase clients
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xvzkrctudezyasinskyo.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('[SERVER] Supabase URL:', supabaseUrl);
console.log('[SERVER] Supabase Anon Key:', supabaseAnonKey ? 'Set' : 'Missing');
console.log('[SERVER] Supabase Service Key:', supabaseServiceKey ? 'Set' : 'Missing');

// Debug: Log all environment variables that start with SUPABASE
console.log('[SERVER] Environment variables:');
Object.keys(process.env).filter(key => key.includes('SUPABASE')).forEach(key => {
  console.log(`[SERVER] ${key}: ${process.env[key] ? 'Set' : 'Missing'}`);
});

// Create Supabase client for user authentication (only if anon key available)
let supabaseAuth = null;
if (supabaseAnonKey) {
  supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
  console.log('[SERVER] Supabase auth client initialized');
} else {
  console.warn('[SERVER] VITE_SUPABASE_ANON_KEY is missing - email pre-filling disabled');
}

// Create Supabase client for admin operations (only if service key available)
let supabase = null;
if (supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('[SERVER] Supabase admin client initialized');
} else {
  console.warn('[SERVER] SUPABASE_SERVICE_ROLE_KEY is missing - subscription tracking disabled');
}

// API Routes
app.post('/api/checkout/create-session', async (req, res) => {
  try {
    const { priceId } = req.body;
    const { authorization } = req.headers;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    if (!authorization) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    // Extract token from "Bearer <token>"
    const token = authorization.replace('Bearer ', '');

    // For now, we'll create a session without user validation
    // In production, you'd validate the Supabase token here
    console.log('[API] Creating Stripe session for price:', priceId);

    // Get user email from the auth token
    let customerEmail = null;
    if (supabaseAuth) {
      try {
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
        if (!authError && user) {
          customerEmail = user.email;
          console.log('[API] Using authenticated email for checkout:', customerEmail);
        } else {
          console.log('[API] Auth error:', authError?.message || 'Unknown error');
        }
      } catch (error) {
        console.log('[API] Could not get user email, will use Stripe form email:', error.message);
      }
    } else {
      console.log('[API] Supabase auth client not available, will use Stripe form email');
    }

    const sessionConfig = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.SITE_URL || 'http://localhost:5173'}/post-checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL || 'http://localhost:5173'}/pricing`,
      metadata: {
        // Add any metadata you need
        source: 'blipp_checkout'
      }
    };

    // Only add customer_email if we have a valid email
    if (customerEmail && customerEmail.trim()) {
      sessionConfig.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('[API] Created session:', session.id);
    res.json({ url: session.url });

  } catch (error) {
    console.error('[API] Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe verification endpoint
app.get('/api/stripe/verify', async (req, res) => {
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    console.log('[API] Verifying Stripe session:', session_id);
    
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    console.log('[API] Session status:', session.payment_status);
    
    if (session.payment_status === 'paid') {
      console.log('[API] Payment successful, subscription data:', {
        customer_email: session.customer_details?.email,
        subscription_id: session.subscription,
        amount_total: session.amount_total,
        currency: session.currency
      });
      
      // Save subscription to Supabase (if available)
      if (supabase) {
        try {
          // First, get the subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          
          // Map price ID to plan tier
          const priceIdToTier = {
            'price_1Rull2Fr7CPBk7jlff5ak4uq': 'basic',
            'price_1Rvn5oFr7CPBk7jl2CryiFFX': 'pro', 
            'price_1RvnATFr7CPBk7jlpYCYcU9q': 'enterprise'
          };
          
          const planTier = priceIdToTier[subscription.items.data[0].price.id] || 'basic';
          
          console.log('[API] Subscription object:', JSON.stringify(subscription, null, 2));
          console.log('[API] Current period start:', subscription.current_period_start);
          console.log('[API] Current period end:', subscription.current_period_end);
          console.log('[API] Items data:', subscription.items?.data?.[0]);
          console.log('[API] Item current_period_start:', subscription.items?.data?.[0]?.current_period_start);
          console.log('[API] Item current_period_end:', subscription.items?.data?.[0]?.current_period_end);
          
          // Find user by email in auth.users
          const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
          
          if (authError) {
            console.error('[API] Error fetching users:', authError);
            throw authError;
          }
          
          const user = authUsers.users.find(u => u.email === session.customer_details?.email);
          
          if (!user) {
            console.error('[API] User not found for email:', session.customer_details?.email);
            return res.status(400).json({ error: 'User not found' });
          }
          
          // Save subscription to subscriptions table
          const { data: subscriptionData, error: subError } = await supabase
            .from('subscriptions')
            .upsert({
              user_id: user.id,
              stripe_subscription_id: session.subscription,
              plan_tier: planTier,
              status: subscription.status,
              current_period_start: subscription.items?.data?.[0]?.current_period_start ? new Date(subscription.items.data[0].current_period_start * 1000).toISOString() : null,
              current_period_end: subscription.items?.data?.[0]?.current_period_end ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString() : null
            }, {
              onConflict: 'stripe_subscription_id'
            });
          
          if (subError) {
            console.error('[API] Error saving subscription:', subError);
            throw subError;
          }
          
          // Create a business first if it doesn't exist
          const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .upsert({
              id: user.id, // Use user ID as business ID for simplicity
              name: `${user.email.split('@')[0]}'s Business`,
              owner_id: user.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            });
          
          if (businessError) {
            console.error('[API] Error creating business:', businessError);
            // Continue anyway, don't throw
          }
          
          // Update or create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email,
              business_id: user.id, // Use user ID as business ID
              stripe_customer_id: session.customer,
              onboarding_completed: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            });
          
          if (profileError) {
            console.error('[API] Error updating profile:', profileError);
          } else {
            console.log('[API] Successfully updated profile');
          }
          
          console.log('[API] Successfully saved subscription to Supabase');
          console.log('[API] User ID:', user.id);
          console.log('[API] Subscription ID:', session.subscription);
          console.log('[API] Plan Tier:', planTier);
          
        } catch (supabaseError) {
          console.error('[API] Error saving to Supabase:', supabaseError);
          // Don't fail the request, just log the error
        }
      } else {
        console.log('[API] Supabase not available - subscription not saved to database');
      }
      
      res.json({ ok: true, session });
    } else if (session.payment_status === 'pending') {
      res.json({ ok: false, reason: 'pending' });
    } else {
      res.json({ ok: false, reason: 'failed', error: 'Payment not completed' });
    }
    
  } catch (error) {
    console.error('[API] Error verifying session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Subscription status endpoint
app.get('/api/subscription/status', async (req, res) => {
  try {
    const { authorization } = req.headers;
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }
    
    if (!supabase) {
      // Return default status when Supabase is not available
      return res.json({
        active: false,
        status: 'none',
        plan_tier: null,
        onboarding_completed: false
      });
    }
    
    const token = authorization.replace('Bearer ', '');
    
    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.log('[API] Checking subscription for user:', user.id);
    
    // First, let's see ALL subscriptions for this user
    const { data: allSubscriptions, error: allSubError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    console.log('[API] All subscriptions for user:', { allSubscriptions, allSubError });
    
    // Query for active subscription - get the most recent one
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('status, plan_tier, current_period_end, created_at')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1);
    
    console.log('[API] Active subscription query result:', { subscriptions, subError });
    
    if (subError) {
      console.error('[API] Subscription query error:', subError);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const subscription = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;
    
    // Get profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();
    
    const isActive = !!subscription;
    const status = subscription ? subscription.status : 'none';
    const planTier = subscription ? subscription.plan_tier : null;
    
    console.log('[API] Final subscription status:', { 
      isActive, 
      status, 
      planTier, 
      subscription: subscription ? {
        status: subscription.status,
        plan_tier: subscription.plan_tier,
        created_at: subscription.created_at
      } : null
    });
    
    res.json({
      active: isActive,
      status: status,
      plan_tier: planTier,
      onboarding_completed: profile?.onboarding_completed || false
    });
    
  } catch (error) {
    console.error('[API] Subscription status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
});
