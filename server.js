import express from 'express';
import cors from 'cors';
import path from 'path';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env files
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177'],
  credentials: true
}));
app.use(express.json());

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
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

// Debug: Log OpenAI API key status
console.log('[SERVER] OpenAI API Key:', process.env.OPENAI_API_KEY ? `Set (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : 'Missing');

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
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

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
      success_url: `${process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://myblipp.com'}/post-checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://myblipp.com'}/pricing`,
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
              created_at: new Date().toISOString()
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
              user_id: user.id,
              business_id: user.id, // Use user ID as business ID
              role: 'owner',
              created_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
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
    
    // Query for candidate subscriptions - we'll enforce date window in code
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('status, plan_tier, current_period_end, created_at')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(3);
    
    console.log('[API] Active subscription query result:', { subscriptions, subError });
    
    if (subError) {
      console.error('[API] Subscription query error:', subError);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Determine active using both status and period end
    const nowIso = new Date().toISOString();
    console.log('[API] Current time (ISO):', nowIso);
    
    const subscription = (subscriptions || []).find((s) => {
      if (!s) return false;
      const statusOk = ['active', 'trialing', 'past_due'].includes(s.status);
      const endOk = s.current_period_end ? s.current_period_end > nowIso : false;
      
      console.log('[API] Checking subscription:', {
        status: s.status,
        statusOk,
        current_period_end: s.current_period_end,
        endOk,
        comparison: s.current_period_end ? `${s.current_period_end} > ${nowIso} = ${s.current_period_end > nowIso}` : 'no end date'
      });
      
      return statusOk && endOk;
    }) || null;
    
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

// Dev-only: expire the latest subscription for the authenticated user (testing)
// WARNING: This is only for local development. It requires SERVICE ROLE and Bearer token.
app.post('/api/dev/subscriptions/expire', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Disabled in production' });
    }

    const { authorization } = req.headers;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not available' });
    }

    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Find the most recent subscription for the user
    const { data: subs, error: listErr } = await supabase
      .from('subscriptions')
      .select('id, current_period_end, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (listErr) {
      return res.status(500).json({ error: 'Database error' });
    }
    const sub = subs && subs[0];
    if (!sub) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    // Set current_period_end to now - 1 second and status to canceled
    const expiredIso = new Date(Date.now() - 1000).toISOString();
    const { error: updErr } = await supabase
      .from('subscriptions')
      .update({ current_period_end: expiredIso, status: 'canceled' })
      .eq('id', sub.id);

    if (updErr) {
      return res.status(500).json({ error: 'Update failed' });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('[API] dev expire error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Zapier API endpoints
app.get('/api/zapier/ping', (req, res) => {
  console.log('[ZAPIER_PING] Ping request received:', {
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body
  });

  // Validate Zapier token from query parameter or header
  const zapierToken = req.query.zapier_token || req.headers['x-zapier-token'];
  
  if (!zapierToken) {
    console.log('[ZAPIER_PING] No token provided');
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  // For multi-tenant tokens, we need to validate against the database
  if (zapierToken.startsWith('blipp_')) {
    console.log('[ZAPIER_PING] Validating multi-tenant token:', zapierToken);
    
    // Find business by zapier_token
    supabase
      .from('businesses')
      .select('id, name, created_by')
      .eq('zapier_token', zapierToken)
      .single()
      .then(({ data: business, error }) => {
        if (error || !business) {
          console.log('[ZAPIER_PING] Invalid token or business not found:', error?.message);
          return res.status(401).json({ ok: false, error: 'unauthorized' });
        }
        
        console.log('[ZAPIER_PING] Token validated for business:', business.name);
        return res.status(200).json({ 
          ok: true, 
          business: {
            id: business.id,
            name: business.name
          }
        });
      })
      .catch(err => {
        console.error('[ZAPIER_PING] Database error:', err);
        return res.status(500).json({ ok: false, error: 'Internal server error' });
      });
  } else {
    // Legacy single-tenant token validation
    if (zapierToken !== process.env.ZAPIER_TOKEN) {
      console.log('[ZAPIER_PING] Invalid legacy token');
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    
    console.log('[ZAPIER_PING] Legacy token validated');
    return res.status(200).json({ ok: true });
  }
});

// Debug endpoint to check automation templates
app.get('/api/debug-templates', async (req, res) => {
  try {
    const businessId = "5fcd7b0d-aa61-4b72-bba7-0709e0d2fba2"; // Your business ID
    
    const { data: templates, error: templatesError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', businessId);

    if (templatesError) {
      return res.status(500).json({ error: templatesError.message });
    }

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('automation_enrollments')
      .select('*')
      .eq('business_id', businessId);

    if (enrollmentsError) {
      return res.status(500).json({ error: enrollmentsError.message });
    }

    return res.status(200).json({
      business_id: businessId,
      templates: templates,
      enrollments: enrollments,
      templatesCount: templates?.length || 0,
      enrollmentsCount: enrollments?.length || 0
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check business and customer mapping
app.get('/api/debug-business-mapping', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email parameter required' });
    }

    console.log('[DEBUG] Checking business mapping for email:', email);

    // Check all businesses
    const { data: allBusinesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, name, created_at, created_by')
      .order('created_at', { ascending: true });

    if (businessesError) {
      return res.status(500).json({ error: businessesError.message });
    }

    // Check for name match
    const username = email.split('@')[0];
    const nameMatches = allBusinesses.filter(b => 
      b.name.toLowerCase().includes(username.toLowerCase())
    );

    // Check customers for each business
    const businessDetails = await Promise.all(
      allBusinesses.map(async (business) => {
        const { data: customers, error: customersError } = await supabase
          .from('customers')
          .select('id, full_name, email, source')
          .eq('business_id', business.id)
          .limit(5);

        return {
          ...business,
          customer_count: customers?.length || 0,
          recent_customers: customers || [],
          customers_error: customersError?.message
        };
      })
    );

    res.json({
      email,
      username,
      total_businesses: allBusinesses.length,
      businesses: businessDetails,
      name_matches: nameMatches,
      email_to_business_map: {
        'shirley.xane@gmail.com': '5fcd7b0d-aa61-4b72-bba7-0709e0d2fba2'
      }
    });

  } catch (error) {
    console.error('[DEBUG] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check customers and businesses
app.get('/api/debug-customers', async (req, res) => {
  try {
    // Get all businesses
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, created_by, created_at')
      .order('created_at', { ascending: true });

    if (businessError) {
      return res.status(500).json({ error: businessError.message });
    }

    // Get all customers with their business info
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name, email, business_id, created_by, created_at, source')
      .order('created_at', { ascending: false });

    if (customerError) {
      return res.status(500).json({ error: customerError.message });
    }

    // Group customers by business
    const customersByBusiness = {};
    customers.forEach(customer => {
      if (!customersByBusiness[customer.business_id]) {
        customersByBusiness[customer.business_id] = [];
      }
      customersByBusiness[customer.business_id].push(customer);
    });

    // Get customers for specific business (your business)
    const yourBusinessId = "5fcd7b0d-aa61-4b72-bba7-0709e0d2fba2";
    const yourCustomers = customers.filter(c => c.business_id === yourBusinessId);

    return res.status(200).json({
      businesses: businesses,
      customersByBusiness: customersByBusiness,
      totalCustomers: customers.length,
      totalBusinesses: businesses.length,
      yourBusinessId: yourBusinessId,
      yourCustomers: yourCustomers,
      yourCustomersCount: yourCustomers.length
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Securely save business name/website and link profile
app.post('/api/business/save', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { name, website } = req.body || {};
    console.log('Business save request:', { name, website, userId: user.id });

    // Get or create business_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    console.log('Profile data:', profile);
    console.log('User data:', { id: user.id, email: user.email, user_metadata: user.user_metadata });

    let businessId = profile?.business_id || null;

    if (!businessId) {
      console.log('Creating new business...');
      // Use email from user_metadata if user.email is undefined
      const userEmail = user.email || user.user_metadata?.email || user.user_metadata?.full_name || 'unknown@example.com';
      console.log('Inserting with created_by:', userEmail);
      // Insert business using email for created_by (matching RLS policies)
      const { data: created, error: createErr } = await supabase
        .from('businesses')
        .insert({ 
          name: name || 'New Business', 
          website: website || null,
          created_by: userEmail
        })
        .select('id')
        .single();
      if (createErr) {
        console.error('Business creation error:', createErr);
        return res.status(403).json({ error: 'RLS prevented creating business', details: createErr });
      }
      businessId = created.id;
      console.log('Created business with ID:', businessId);
      await supabase.from('profiles').update({ business_id: businessId }).eq('user_id', user.id);
    } else {
      console.log('Updating existing business:', businessId);
      const { error: upErr } = await supabase
        .from('businesses')
        .update({ 
          name: name || null, 
          website: website || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);
      if (upErr) {
        console.error('Business update error:', upErr);
        return res.status(403).json({ error: 'RLS prevented updating business', details: upErr });
      }
      console.log('Business updated successfully');
    }

    res.json({ success: true, business_id: businessId });
  } catch (e) {
    console.error('Business save error', e);
    res.status(500).json({ error: 'Failed to save business' });
  }
});

// Feedback form settings API
app.get('/api/feedback-form-settings', async (req, res) => {
  try {
    const { business_id } = req.query;
    if (!business_id) return res.status(400).json({ error: 'business_id required' });
    const { data, error } = await supabase
      .from('feedback_form_settings')
      .select('settings')
      .eq('business_id', business_id)
      .maybeSingle();
    if (error) throw error;
    res.json({ success: true, settings: data?.settings || null });
  } catch (e) {
    console.error('Load form settings error', e);
    res.status(500).json({ error: 'Failed to load form settings' });
  }
});

app.post('/api/feedback-form-settings', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { settings } = req.body || {};
    
    // Get or create business_id from profile
    let { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();
    
    let businessId = profile?.business_id;
    
    // If no business_id, create one
    if (!businessId) {
      const userEmail = user.email || user.user_metadata?.email || user.user_metadata?.full_name || 'unknown@example.com';
      const { data: created, error: createErr } = await supabase
        .from('businesses')
        .insert({ 
          name: 'My Business', 
          website: null,
          created_by: userEmail
        })
        .select('id')
        .single();
      if (createErr) return res.status(403).json({ error: 'RLS prevented creating business', details: createErr });
      businessId = created.id;
      await supabase.from('profiles').update({ business_id: businessId }).eq('user_id', user.id);
    }

    const { error } = await supabase
      .from('feedback_form_settings')
      .upsert({ business_id: businessId, settings: settings || {}, updated_at: new Date().toISOString() })
      .select('business_id')
      .single();
    if (error) throw error;

    res.json({ success: true });
  } catch (e) {
    console.error('Save form settings error', e);
    res.status(500).json({ error: 'Failed to save form settings' });
  }
});

// Send follow-up email to customer
app.post('/api/send-followup-email', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { to, subject, message, customerName } = req.body || {};
    
    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get business info for email signature
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();
    
    let businessName = 'Our Business';
    if (profile?.business_id) {
      const { data: business } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', profile.business_id)
        .single();
      if (business?.name) businessName = business.name;
    }

    // Replace placeholders in message
    const processedMessage = message
      .replace(/\[YOUR_NAME\]/g, 'The Team')
      .replace(/\[YOUR_BUSINESS_NAME\]/g, businessName)
      .replace(/\[YOUR_PHONE\]/g, 'your business phone');

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${businessName} <noreply@myblipp.com>`,
        to: [to],
        subject: subject,
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">${businessName}</h1>
            </div>
            <div style="padding: 30px;">
              <div style="white-space: pre-line; line-height: 1.6; color: #333;">
                ${processedMessage}
              </div>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
              <p>This email was sent from Blipp - Reputation Management</p>
            </div>
          </div>
        `
      })
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(errorData.message || 'Failed to send email');
    }

    res.json({ success: true, message: 'Follow-up email sent successfully' });
  } catch (e) {
    console.error('Send follow-up email error', e);
    res.status(500).json({ error: 'Failed to send follow-up email: ' + e.message });
  }
});
app.post('/api/zapier/upsert-customer', async (req, res) => {
  try {
    // Validate Zapier token (check both header and URL param)
    const zapierToken = req.headers['x-zapier-token'] || req.query.zapier_token;
    
    // NEW: Try to find business by zapier_token first (multi-tenant)
    let business;
    if (zapierToken) {
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, created_by')
        .eq('zapier_token', zapierToken)
        .single();

      if (!businessError && businessData) {
        business = businessData;
        console.log('[ZAPIER] Found business by zapier_token:', { id: business.id, name: business.name });
      }
    }

    // Fallback: Use shared token for backward compatibility
    if (!business && (!zapierToken || zapierToken !== process.env.ZAPIER_TOKEN)) {
      console.log('[ZAPIER] Token validation failed:', { 
        headerToken: req.headers['x-zapier-token'], 
        queryToken: req.query.zapier_token,
        expectedToken: process.env.ZAPIER_TOKEN 
      });
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Parse and validate payload
    const { email, phone, first_name, last_name, external_id, tags, source, event_ts } = req.body;
    
    if (!email && !phone) {
      return res.status(400).json({ ok: false, error: 'Either email or phone is required' });
    }

    // First name and last name are optional - use defaults if not provided
    const firstName = first_name || '';
    const lastName = last_name || '';

    // Log the payload for debugging
    console.log('[ZAPIER] Upsert customer payload:', {
      email,
      phone,
      first_name,
      last_name,
      external_id,
      tags,
      source,
      event_ts
    });

    // Log all headers for debugging
    console.log('[ZAPIER] All headers:', req.headers);
    console.log('[ZAPIER] Request body:', req.body);

    // Try to get business_id from multiple sources (in order of preference)
    // Note: business might already be found by zapier_token above
    
    // 1. Check for business_id in headers (X-Blipp-Business) - manual override
    const businessId = req.headers['x-blipp-business'];
    if (businessId) {
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, created_by')
        .eq('id', businessId)
        .single();

      if (businessError) {
        console.error('[ZAPIER] Error getting specified business:', businessError);
        return res.status(400).json({ 
          ok: false, 
          error: `Business ${businessId} not found. Please check your business ID.` 
        });
      }
      business = businessData;
      console.log('[ZAPIER] Using specified business (header):', { id: business.id, name: business.name });
    } else {
      // 2. Try to get business from Zapier account connection (if provided)
      const zapierAccountEmail = req.headers['x-zapier-account-email'] || req.body.account_email;
      if (zapierAccountEmail) {
        console.log('[ZAPIER] Looking for business by Zapier account email:', zapierAccountEmail);
        
        // EMAIL-BASED BUSINESS DETECTION: Always find business by email first
        console.log('[ZAPIER] Looking for business by email:', zapierAccountEmail);
        
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('id, name, created_by')
          .eq('created_by', zapierAccountEmail)
          .order('created_at', { ascending: false }) // Get most recent if multiple
          .limit(1)
          .single();

        if (!businessError && businessData) {
          business = businessData;
          console.log('[ZAPIER] Found business via email match:', { id: business.id, name: business.name, email: zapierAccountEmail });
        } else {
          console.log('[ZAPIER] No business found for email:', zapierAccountEmail, 'Error:', businessError?.message);
        }
        
        // If still no business found, create a helpful error message
        if (!business) {
          console.log('[ZAPIER] No business found for email:', zapierAccountEmail);
          return res.status(400).json({ 
            ok: false, 
            error: `No business found for email ${zapierAccountEmail}. Please ensure you have created a business in your Blipp dashboard first.`,
            hint: 'Make sure your business name contains part of your email address, or contact support to map your email to your business.'
          });
        }
      }
      
      // 3. Fallback: Get the first available business (for backward compatibility)
      if (!business) {
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('id, name, created_by')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (businessError) {
          console.error('[ZAPIER] Error getting business:', businessError);
          return res.status(500).json({ 
            ok: false, 
            error: 'No business found. Please create a business first in the dashboard.' 
          });
        }
        business = businessData;
        console.log('[ZAPIER] Using first available business (fallback):', { id: business.id, name: business.name });
      }
    }

    console.log('[ZAPIER] Using business:', {
      id: business.id,
      name: business.name,
      created_by: business.created_by
    });


    // Prepare customer data for upsert
    const customerData = {
      business_id: business.id,
      full_name: `${firstName} ${lastName}`.trim() || 'Unknown Customer',
      email: email?.toLowerCase().trim() || null,
      phone: phone?.replace(/\D/g, '') || null, // digits only
      external_id: external_id || null,
      source: source || 'zapier',
      tags: tags || [],
      created_by: business.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('[ZAPIER] Processing customer data:', {
      name: customerData.full_name,
      email: customerData.email,
      phone: customerData.phone,
      external_id: customerData.external_id,
      business_id: customerData.business_id
    });

    // First check if customer already exists by email OR external_id
    let existingCustomer = null;
    
    // Try to find by email first
    if (customerData.email) {
      const { data: existing, error: existingError } = await supabase
        .from('customers')
        .select('id, full_name, email, phone, external_id')
        .eq('business_id', customerData.business_id)
        .eq('email', customerData.email)
        .single();
      
      if (!existingError && existing) {
        existingCustomer = existing;
        console.log('[ZAPIER] Found existing customer by email:', existingCustomer.email);
      }
    }
    
    // If not found by email, try to find by external_id (for Google Sheets row updates)
    if (!existingCustomer && customerData.external_id) {
      const { data: existing, error: existingError } = await supabase
        .from('customers')
        .select('id, full_name, email, phone, external_id')
        .eq('business_id', customerData.business_id)
        .eq('external_id', customerData.external_id)
        .single();
      
      if (!existingError && existing) {
        existingCustomer = existing;
        console.log('[ZAPIER] Found existing customer by external_id:', existingCustomer.email, '->', customerData.email);
      }
    }
    
    // If still not found, try to find by name + phone combination (for cases where email changed)
    if (!existingCustomer && customerData.full_name && customerData.phone) {
      const { data: existing, error: existingError } = await supabase
        .from('customers')
        .select('id, full_name, email, phone, external_id')
        .eq('business_id', customerData.business_id)
        .eq('full_name', customerData.full_name)
        .eq('phone', customerData.phone)
        .single();
      
      if (!existingError && existing) {
        existingCustomer = existing;
        console.log('[ZAPIER] Found existing customer by name+phone:', existingCustomer.email, '->', customerData.email);
      }
    }

    let customer;
    if (existingCustomer) {
      // Update existing customer
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({
          full_name: customerData.full_name,
          email: customerData.email, // Include email in updates
          phone: customerData.phone,
          external_id: customerData.external_id,
          source: customerData.source,
          tags: customerData.tags,
          updated_at: customerData.updated_at
        })
        .eq('id', existingCustomer.id)
        .select('id, full_name, email, phone')
        .single();

      if (updateError) {
        console.error('[ZAPIER] Customer update error:', updateError);
        return res.status(500).json({ 
          ok: false, 
          error: 'Failed to update customer',
          details: updateError.message,
          code: updateError.code
        });
      }
      customer = updatedCustomer;
    } else {
      // Insert new customer
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert(customerData)
        .select('id, full_name, email, phone')
        .single();

      if (insertError) {
        console.error('[ZAPIER] Customer insert error:', insertError);
        return res.status(500).json({ 
          ok: false, 
          error: 'Failed to insert customer',
          details: insertError.message,
          code: insertError.code
        });
      }
      customer = newCustomer;
    }


    // Log to audit_log
    try {
      await supabase
        .from('audit_log')
        .insert({
          business_id: business.id,
          user_id: 'zapier',
          entity: 'customers',
          entity_id: customer.id,
          action: 'upsert',
          payload_hash: crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex'),
          details: {
            source: 'zapier',
            external_id: external_id,
            event_ts: event_ts
          }
        });
    } catch (auditError) {
      console.error('[ZAPIER] Audit log error:', auditError);
      // Don't fail the request if audit logging fails
    }

    console.log('[ZAPIER] ✅ Customer upserted successfully:', {
      customer_id: customer.id,
      name: customerData.full_name,
      email: customerData.email,
      business_id: business.id,
      created_by: customerData.created_by
    });

    // Initialize defaults for this business if not already done
    try {
      await initializeDefaultsForBusiness(business.id);
      
      // Mark that this business has CRM integration working
      await supabase
        .from('businesses')
        .update({ 
          crm_integration_active: true,
          crm_integration_connected_at: new Date().toISOString()
        })
        .eq('id', business.id);
        
      console.log('[ZAPIER] ✅ CRM integration marked as active for business:', business.id);
    } catch (defaultsError) {
      console.error('[ZAPIER] Defaults initialization error:', defaultsError);
      // Don't fail the request if defaults initialization fails
    }

    return res.status(200).json({ 
      ok: true, 
      customer_id: customer.id,
      customer: {
        id: customer.id,
        full_name: customer.full_name,
        email: customer.email,
        phone: customer.phone
      },
      business_id: business.id,
      business_name: business.name,
      created_by: business.created_by,
      message: 'Customer upserted successfully'
    });
  } catch (error) {
    console.error('[ZAPIER] Upsert customer error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

app.post('/api/zapier/review-request', async (req, res) => {
  try {
    // Validate Zapier token
    const zapierToken = req.headers['x-zapier-token'];
    if (!zapierToken || zapierToken !== process.env.ZAPIER_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse and validate payload
    const { external_id, email, phone, first_name, last_name, job_id, job_type, invoice_id, invoice_total, event_ts } = req.body;
    
    if (!email && !phone) {
      return res.status(400).json({ error: 'Either email or phone is required' });
    }

    // Log the payload for debugging
    console.log('[ZAPIER] Review request payload:', {
      external_id,
      email,
      phone,
      first_name,
      last_name,
      job_id,
      job_type,
      invoice_id,
      invoice_total,
      event_ts
    });

    // TODO: Call internal service to enqueue review request job
    // await enqueueReviewRequest({ external_id, email, phone, first_name, last_name, job_id, job_type, invoice_id, invoice_total, event_ts });

    return res.json({ ok: true });
  } catch (error) {
    console.error('[ZAPIER] Review request error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/zapier/event', async (req, res) => {
  try {
    // Validate Zapier token
    const zapierToken = req.headers['x-zapier-token'];
    if (!zapierToken || zapierToken !== process.env.ZAPIER_TOKEN) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Parse and validate payload
    const { event_type, email, external_id, service_date, payload } = req.body;
    
    if (!event_type) {
      return res.status(400).json({ ok: false, error: 'Event type is required' });
    }

    if (!email && !external_id) {
      return res.status(400).json({ ok: false, error: 'Either email or external_id is required' });
    }

    // Log the payload for debugging
    console.log('[ZAPIER] Event payload:', {
      event_type,
      email,
      external_id,
      service_date,
      payload
    });

    // Get or create business
    let { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .limit(1)
      .single();

    if (businessError && businessError.code === 'PGRST116') {
      const { data: newBusiness, error: createError } = await supabase
        .from('businesses')
        .insert({
          name: 'Default Business',
          created_by: user.email || user.user_metadata?.email || 'system@blipp.com'
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[ZAPIER] Error creating business:', createError);
        return res.status(500).json({ ok: false, error: 'Failed to create business' });
      }
      business = newBusiness;
    } else if (businessError) {
      console.error('[ZAPIER] Error getting business:', businessError);
      return res.status(500).json({ ok: false, error: 'Failed to get business' });
    }

    // Find customer by email or external_id
    let customer = null;
    if (email) {
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('id, full_name, email, phone')
        .eq('business_id', business.id)
        .eq('email', email.toLowerCase().trim())
        .limit(1);

      if (customerError) {
        console.error('[ZAPIER] Error finding customer by email:', customerError);
        return res.status(500).json({ ok: false, error: 'Failed to find customer' });
      }
      customer = customers?.[0];
    } else if (external_id) {
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('id, full_name, email, phone')
        .eq('business_id', business.id)
        .ilike('notes', `%External ID: ${external_id}%`)
        .limit(1);

      if (customerError) {
        console.error('[ZAPIER] Error finding customer by external_id:', customerError);
        return res.status(500).json({ ok: false, error: 'Failed to find customer' });
      }
      customer = customers?.[0];
    }

    // Create customer if not found
    if (!customer) {
      const customerData = {
        business_id: business.id,
        full_name: 'Unknown Customer',
        email: email?.toLowerCase().trim() || null,
        phone: null,
        notes: external_id ? `External ID: ${external_id}` : null,
        tags: [],
        status: 'active',
        created_by: 'zapier'
      };

      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert(customerData)
        .select('id, full_name, email, phone')
        .single();

      if (createError) {
        console.error('[ZAPIER] Error creating customer:', createError);
        return res.status(500).json({ ok: false, error: 'Failed to create customer' });
      }
      customer = newCustomer;
    }

    // Get active sequences for this event type
    const { data: sequences, error: sequencesError } = await supabase
      .from('sequences')
      .select('id, name, quiet_hours_start, quiet_hours_end')
      .eq('business_id', business.id)
      .eq('trigger_event_type', event_type)
      .eq('status', 'active');

    if (sequencesError) {
      console.error('[ZAPIER] Error getting sequences:', sequencesError);
      return res.status(500).json({ ok: false, error: 'Failed to get sequences' });
    }

    if (!sequences || sequences.length === 0) {
      console.log('[ZAPIER] No active sequences found for event type:', event_type);
      return res.status(200).json({ 
        ok: true, 
        message: 'No active sequences found for this event type',
        customer_id: customer.id,
        sequences_found: 0
      });
    }

    // Process each sequence
    const enrollments = [];
    
    for (const sequence of sequences) {
      try {
        // Get first step to calculate timing
        const { data: firstStep, error: stepError } = await supabase
          .from('sequence_steps')
          .select('id, kind, wait_ms')
          .eq('sequence_id', sequence.id)
          .eq('step_index', 0)
          .single();

        if (stepError && stepError.code !== 'PGRST116') {
          console.error('[ZAPIER] Error getting first step:', stepError);
          continue;
        }

        // Calculate next run time
        const now = new Date();
        let nextRun = new Date(now);

        // If there's a wait step, add the wait time
        if (firstStep && firstStep.kind === 'wait' && firstStep.wait_ms) {
          nextRun = new Date(now.getTime() + firstStep.wait_ms);
        }

        // Apply quiet hours if configured
        if (sequence.quiet_hours_start && sequence.quiet_hours_end) {
          const startTime = new Date();
          const endTime = new Date();
          
          const [startHour, startMin] = sequence.quiet_hours_start.split(':').map(Number);
          const [endHour, endMin] = sequence.quiet_hours_end.split(':').map(Number);
          
          startTime.setHours(startHour, startMin, 0, 0);
          endTime.setHours(endHour, endMin, 0, 0);
          
          // If next run falls within quiet hours, move to after quiet hours
          if (nextRun >= startTime && nextRun <= endTime) {
            nextRun = new Date(endTime);
          }
        }

        const nextRunAt = nextRun.toISOString();

        // Check if enrollment already exists
        const { data: existingEnrollment, error: findError } = await supabase
          .from('sequence_enrollments')
          .select('id, status')
          .eq('business_id', business.id)
          .eq('sequence_id', sequence.id)
          .eq('customer_id', customer.id)
          .single();

        let enrollmentId;
        if (findError && findError.code === 'PGRST116') {
          // Create new enrollment
          const { data: newEnrollment, error: createError } = await supabase
            .from('sequence_enrollments')
            .insert({
              business_id: business.id,
              sequence_id: sequence.id,
              customer_id: customer.id,
              status: 'active',
              current_step_index: 0,
              next_run_at: nextRunAt,
              last_event_at: new Date().toISOString(),
              meta: {}
            })
            .select('id')
            .single();

          if (createError) {
            console.error('[ZAPIER] Error creating enrollment:', createError);
            continue;
          }
          enrollmentId = newEnrollment.id;
        } else if (findError) {
          console.error('[ZAPIER] Error checking existing enrollment:', findError);
          continue;
        } else {
          // Update existing enrollment
          const { data: updatedEnrollment, error: updateError } = await supabase
            .from('sequence_enrollments')
            .update({
              status: 'active',
              current_step_index: 0,
              next_run_at: nextRunAt,
              last_event_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingEnrollment.id)
            .select('id')
            .single();

          if (updateError) {
            console.error('[ZAPIER] Error updating enrollment:', updateError);
            continue;
          }
          enrollmentId = updatedEnrollment.id;
        }

        enrollments.push({
          sequence_id: sequence.id,
          sequence_name: sequence.name,
          enrollment_id: enrollmentId,
          next_run_at: nextRunAt
        });

        // Log to automation_logs
        try {
          await supabase
            .from('automation_logs')
            .insert({
              business_id: business.id,
              level: 'info',
              source: 'trigger',
              sequence_id: sequence.id,
              enrollment_id: enrollmentId,
              customer_id: customer.id,
              message: `Enrollment created/updated for sequence: ${sequence.name}`,
              data: {
                event_type: event_type,
                next_run_at: nextRunAt
              }
            });
        } catch (logError) {
          console.error('[ZAPIER] Error logging automation event:', logError);
        }

      } catch (error) {
        console.error(`[ZAPIER] Error processing sequence ${sequence.id}:`, error);
      }
    }

    console.log('[ZAPIER] ✅ Event processed successfully:', {
      event_type,
      customer_id: customer.id,
      sequences_processed: sequences.length,
      enrollments_created: enrollments.length
    });

    return res.status(200).json({ 
      ok: true,
      customer_id: customer.id,
      sequences_found: sequences.length,
      enrollments_created: enrollments.length,
      enrollments
    });

  } catch (error) {
    console.error('[ZAPIER] Event processing error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Helper function to validate Zapier HMAC
function validateZapierHMAC(payload, signature, secret, timestamp) {
  try {
    const crypto = crypto;
    const payloadString = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('[HMAC_VALIDATION] Error validating HMAC:', error);
    return false;
  }
}

// Helper function to create scheduled jobs
async function createScheduledJob(businessId, templateId, runAt, payload) {
  try {
    const { data: job, error } = await supabase
      .from('scheduled_jobs')
      .insert({
        business_id: businessId,
        template_id: templateId,
        run_at: runAt,
        payload: payload,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('[SCHEDULED_JOBS] Error creating job:', error);
      return { success: false, error };
    }

    console.log(`[SCHEDULED_JOBS] Created job ${job.id} for template ${templateId} at ${runAt}`);
    return { success: true, job };
  } catch (error) {
    console.error('[SCHEDULED_JOBS] Unexpected error creating job:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to create scheduled jobs with deduplication
async function createScheduledJobWithDeduplication(businessId, templateId, runAt, payload) {
  try {
    // Create payload hash for deduplication
    const crypto = await import('crypto');
    const payloadHash = crypto.createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');

    // Check if job already exists
    const { data: existingJob, error: checkError } = await supabase
      .from('scheduled_jobs')
      .select('id')
      .eq('template_id', templateId)
      .eq('run_at', runAt)
      .eq('payload_hash', payloadHash)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[SCHEDULED_JOBS] Error checking for duplicate job:', checkError);
      return { success: false, error: checkError };
    }

    if (existingJob) {
      console.log(`[SCHEDULED_JOBS] Duplicate job found for template ${templateId} at ${runAt}`);
      return { success: false, duplicate: true, job: existingJob };
    }

    // Create the job
    const { data: job, error } = await supabase
      .from('scheduled_jobs')
      .insert({
        business_id: businessId,
        template_id: templateId,
        run_at: runAt,
        payload: payload,
        payload_hash: payloadHash,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('[SCHEDULED_JOBS] Error creating job:', error);
      return { success: false, error };
    }

    console.log(`[SCHEDULED_JOBS] Created job ${job.id} for template ${templateId} at ${runAt}`);
    return { success: true, job };
  } catch (error) {
    console.error('[SCHEDULED_JOBS] Unexpected error creating job:', error);
    return { success: false, error: error.message };
  }
}
// Provision default templates for a business
async function provisionDefaultTemplates(businessId) {
  try {
    console.log(`[PROVISION_DEFAULTS] Starting template provisioning for business: ${businessId}`);
    
    // Check which templates already exist
    const { data: existingTemplates, error: checkError } = await supabase
      .from('automation_templates')
      .select('key')
      .eq('business_id', businessId)
      .in('key', ['job_completed', 'invoice_paid', 'service_reminder']);

    if (checkError) {
      console.error('[PROVISION_DEFAULTS] Error checking existing templates:', checkError);
      return { success: false, error: checkError };
    }

    const existingKeys = new Set(existingTemplates.map(t => t.key));
    const templatesToCreate = [];

    // Job Completed template
    if (!existingKeys.has('job_completed')) {
      templatesToCreate.push({
        business_id: businessId,
        key: 'job_completed',
        name: 'Job Completed Follow-up',
        status: 'ready',
        channels: ['sms', 'email'],
        trigger_type: 'event',
        config_json: {
          message: "Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review.",
          delay_hours: 24,
          tokens: ['CUSTOMER_NAME', 'SERVICE_TYPE', 'REVIEW_LINK']
        }
      });
    }

    // Invoice Paid template
    if (!existingKeys.has('invoice_paid')) {
      templatesToCreate.push({
        business_id: businessId,
        key: 'invoice_paid',
        name: 'Invoice Paid Follow-up',
        status: 'ready',
        channels: ['email', 'sms'],
        trigger_type: 'event',
        config_json: {
          message: "Thank you for your payment! We appreciate your business. Please consider leaving us a review.",
          delay_hours: 48,
          tokens: ['CUSTOMER_NAME', 'INVOICE_AMOUNT', 'REVIEW_LINK']
        }
      });
    }

    // Service Reminder template
    if (!existingKeys.has('service_reminder')) {
      templatesToCreate.push({
        business_id: businessId,
        key: 'service_reminder',
        name: 'Service Reminder',
        status: 'ready',
        channels: ['sms', 'email'],
        trigger_type: 'date_based',
        config_json: {
          message: "This is a friendly reminder about your upcoming service appointment. We look forward to serving you!",
          follow_ups: [
            { delay_days: 1, message: "Reminder: Your service is tomorrow! Please confirm your appointment." },
            { delay_days: 7, message: "How was your recent service? We'd love your feedback!" },
            { delay_days: 30, message: "It's been a month since your service. How are things working out?" }
          ],
          tokens: ['CUSTOMER_NAME', 'SERVICE_DATE', 'CONFIRM_LINK', 'REVIEW_LINK']
        }
      });
    }

    let createdTemplates = [];

    if (templatesToCreate.length > 0) {
      const { data: newTemplates, error: createError } = await supabase
        .from('automation_templates')
        .insert(templatesToCreate)
        .select();

      if (createError) {
        console.error('[PROVISION_DEFAULTS] Error creating templates:', createError);
        return { success: false, error: createError };
      }

      createdTemplates = newTemplates;
      console.log(`[PROVISION_DEFAULTS] Created ${newTemplates.length} new templates for business: ${businessId}`);
    } else {
      console.log(`[PROVISION_DEFAULTS] All templates already exist for business: ${businessId}`);
    }

    // Check if customers exist for this business
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', businessId)
      .limit(1);

    if (customersError) {
      console.error('[PROVISION_DEFAULTS] Error checking customers:', customersError);
    } else if (customers && customers.length > 0) {
      // Mark business integration as connected if customers exist
      const { error: updateError } = await supabase
        .from('business_integrations')
        .update({ 
          status: 'connected',
          updated_at: new Date().toISOString()
        })
        .eq('business_id', businessId)
        .eq('provider', 'zapier');

      if (updateError) {
        console.error('[PROVISION_DEFAULTS] Error updating integration status:', updateError);
      } else {
        console.log(`[PROVISION_DEFAULTS] Marked Zapier integration as connected for business: ${businessId}`);
      }
    }

    return { 
      success: true, 
      created: createdTemplates,
      total: createdTemplates.length
    };

  } catch (error) {
    console.error('[PROVISION_DEFAULTS] Unexpected error:', error);
    return { success: false, error: error.message };
  }
}

// Unified Zapier Ingest Endpoint
// Hardened Zapier Ingest Endpoint with Idempotency
app.post('/api/zapier/ingest', async (req, res) => {
  try {
    // Extract headers
    const businessId = req.headers['x-blipp-business'];
    const signature = req.headers['x-blipp-signature'];
    const idempotencyKey = req.headers['x-idempotency-key'];
    const timestamp = req.headers['x-zapier-timestamp'];

    // Validate required headers
    if (!businessId) {
      console.error('[ZAPIER_INGEST] Missing X-Blipp-Business header');
      return res.status(400).json({ error: 'Missing X-Blipp-Business header' });
    }

    if (!signature) {
      console.error('[ZAPIER_INGEST] Missing X-Blipp-Signature header');
      return res.status(400).json({ error: 'Missing X-Blipp-Signature header' });
    }

    if (!idempotencyKey) {
      console.error('[ZAPIER_INGEST] Missing X-Idempotency-Key header');
      return res.status(400).json({ error: 'Missing X-Idempotency-Key header' });
    }

    // Extract and validate body
    const { event_type, payload } = req.body;

    if (!event_type || !payload) {
      console.error('[ZAPIER_INGEST] Missing required fields:', { event_type, payload: !!payload });
      return res.status(400).json({ error: 'Missing required fields: event_type, payload' });
    }

    // Canonicalize event type
    const canonicalEvents = {
      'customer.created': 'customer.created',
      'customer.updated': 'customer.updated',
      'job.completed': 'job.completed',
      'invoice.paid': 'invoice.paid',
      'appointment.scheduled': 'appointment.scheduled',
      // Handle variations
      'customer_created': 'customer.created',
      'customer_updated': 'customer.updated',
      'job_completed': 'job.completed',
      'invoice_paid': 'invoice.paid',
      'appointment_scheduled': 'appointment.scheduled'
    };

    const canonicalEventType = canonicalEvents[event_type];
    if (!canonicalEventType) {
      console.error('[ZAPIER_INGEST] Unsupported event type:', event_type);
      return res.status(400).json({ 
        error: `Unsupported event type: ${event_type}. Supported: ${Object.keys(canonicalEvents).join(', ')}` 
      });
    }

    // Normalize payload fields
    const normalizedPayload = {
      name: payload.name || payload.full_name || payload.customer_name,
      email: payload.email,
      phone: payload.phone || payload.phone_number,
      service_date: payload.service_date || payload.appointment_date,
      crm_id: payload.crm_id || payload.id || payload.customer_id,
      source: payload.source || 'zapier'
    };

    // Validate normalized payload
    if (!normalizedPayload.email) {
      console.error('[ZAPIER_INGEST] Missing required email in payload');
      return res.status(400).json({ error: 'Missing required email in payload' });
    }

    // Check idempotency
    const crypto = await import('crypto');
    const payloadHash = crypto.createHash('sha256')
      .update(JSON.stringify(normalizedPayload))
      .digest('hex');

    const { data: existingKey, error: idempotencyError } = await supabase
      .from('idempotency_keys')
      .select('id, created_at')
      .eq('business_id', businessId)
      .eq('key', idempotencyKey)
      .single();

    if (idempotencyError && idempotencyError.code !== 'PGRST116') {
      console.error('[ZAPIER_INGEST] Error checking idempotency:', idempotencyError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (existingKey) {
      console.log(`[ZAPIER_INGEST] Duplicate idempotency key detected: ${idempotencyKey} (created: ${existingKey.created_at})`);
      return res.status(200).json({ 
        success: true, 
        message: 'Event already processed',
        idempotency_key: idempotencyKey,
        processed_at: existingKey.created_at
      });
    }

    // Get business integration to validate HMAC
    const { data: integration, error: integrationError } = await supabase
      .from('business_integrations')
      .select('metadata_json')
      .eq('business_id', businessId)
      .eq('provider', 'zapier')
      .eq('status', 'active')
      .single();

    if (integrationError || !integration) {
      console.error('[ZAPIER_INGEST] No active Zapier integration found for business:', businessId);
      return res.status(400).json({ error: 'No active Zapier integration found for this business' });
    }

    // Validate HMAC
    const secret = integration.metadata_json?.webhook_secret;
    if (!secret) {
      console.error('[ZAPIER_INGEST] No webhook secret found for business:', businessId);
      return res.status(400).json({ error: 'No webhook secret configured for this business' });
    }

    if (!validateZapierHMAC(normalizedPayload, signature, secret, timestamp)) {
      console.error('[ZAPIER_INGEST] HMAC validation failed for business:', businessId);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Store idempotency key
    const { error: idempotencyInsertError } = await supabase
      .from('idempotency_keys')
      .insert({
        business_id: businessId,
        key: idempotencyKey,
        event_type: canonicalEventType,
        payload_hash: payloadHash
      });

    if (idempotencyInsertError) {
      console.error('[ZAPIER_INGEST] Error storing idempotency key:', idempotencyInsertError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    console.log(`[ZAPIER_INGEST] Processing event: ${canonicalEventType} for business: ${businessId}`);

    let customer = null;
    let processed = false;

    // Handle customer events
    if (canonicalEventType === 'customer.created' || canonicalEventType === 'customer.updated') {
      // Upsert customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .upsert({
          business_id: businessId,
          full_name: normalizedPayload.name,
          email: normalizedPayload.email,
          phone: normalizedPayload.phone,
          service_date: normalizedPayload.service_date,
          source: normalizedPayload.source,
          created_by: 'zapier',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'business_id,email',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (customerError) {
        console.error('[ZAPIER_INGEST] Error upserting customer:', customerError);
      } else {
        customer = customerData;
        processed = true;
        console.log(`[ZAPIER_INGEST] Successfully upserted customer:`, customer);
        
        // Check if automation templates exist for this business
        const { data: templates, error: templatesError } = await supabase
          .from('automation_templates')
          .select('id')
          .eq('business_id', businessId)
          .limit(1);

        if (templatesError) {
          console.error('[ZAPIER_INGEST] Error checking templates:', templatesError);
        } else if (!templates || templates.length === 0) {
          console.log(`[ZAPIER_INGEST] No templates found, provisioning defaults for business: ${businessId}`);
          
          // Use the provisionDefaultTemplates function
          const provisionResult = await provisionDefaultTemplates(businessId);
          if (provisionResult.success) {
            console.log(`[ZAPIER_INGEST] Successfully provisioned ${provisionResult.total} templates for business: ${businessId}`);
          } else {
            console.error('[ZAPIER_INGEST] Error provisioning default templates:', provisionResult.error);
          }
        }
      }
    }

    // Handle job completion and invoice payment events
    if (canonicalEventType === 'job.completed' || canonicalEventType === 'invoice.paid') {
      // First ensure customer exists
      if (!customer) {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .upsert({
            business_id: businessId,
            full_name: normalizedPayload.name,
            email: normalizedPayload.email,
            phone: normalizedPayload.phone,
            service_date: normalizedPayload.service_date,
            source: normalizedPayload.source,
            created_by: 'zapier',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'business_id,email',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (!customerError) {
          customer = customerData;
        }
      }
      
      if (customer) {
        // Map event types to template keys
        const eventToTemplateKey = {
          'job.completed': 'job_completed',
          'invoice.paid': 'invoice_paid'
        };

        const templateKey = eventToTemplateKey[canonicalEventType];
        
        // Find active templates for this business and event type
        const { data: templates, error: templatesError } = await supabase
          .from('automation_templates')
          .select('*')
          .eq('business_id', businessId)
          .eq('key', templateKey)
          .eq('status', 'active');

        if (!templatesError && templates && templates.length > 0) {
          // Create scheduled jobs for each matching template
          for (const template of templates) {
            // Calculate run time based on template config
            const delayHours = template.config_json?.delay_hours ?? 24;
            const runAt = new Date();
            runAt.setHours(runAt.getHours() + delayHours);

            const jobPayload = {
              customer_id: customer.id,
              customer_name: customer.full_name,
              customer_email: customer.email,
              customer_phone: customer.phone,
              event_type: canonicalEventType,
              template_key: template.key,
              message: template.config_json?.message || '',
              channels: template.channels || ['sms', 'email']
            };

            const jobResult = await createScheduledJob(
              businessId,
              template.id,
              runAt.toISOString(),
              jobPayload
            );

            if (jobResult.success) {
              console.log(`[ZAPIER_INGEST] Created scheduled job for template: ${template.name} at ${runAt.toISOString()}`);
            } else {
              console.error('[ZAPIER_INGEST] Error creating scheduled job:', jobResult.error);
            }
          }
          processed = true;
        }
      }
    }

    // Handle appointment scheduling
    if (canonicalEventType === 'appointment.scheduled') {
      // First ensure customer exists
      if (!customer) {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .upsert({
            business_id: businessId,
            full_name: normalizedPayload.name,
            email: normalizedPayload.email,
            phone: normalizedPayload.phone,
            service_date: normalizedPayload.service_date,
            source: normalizedPayload.source,
            created_by: 'zapier',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'business_id,email',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (!customerError) {
          customer = customerData;
        }
      }
      
      if (customer) {
        // Find active service reminder templates
        const { data: templates, error: templatesError } = await supabase
          .from('automation_templates')
          .select('*')
          .eq('business_id', businessId)
          .eq('key', 'service_reminder')
          .eq('status', 'active');

        if (!templatesError && templates && templates.length > 0) {
          // Create scheduled jobs for service reminders
          for (const template of templates) {
            // Main reminder (24 hours after service)
            const mainReminderTime = new Date(normalizedPayload.service_date);
            mainReminderTime.setDate(mainReminderTime.getDate() + 1);

            const mainJobPayload = {
              customer_id: customer.id,
              customer_name: customer.full_name,
              customer_email: customer.email,
              customer_phone: customer.phone,
              event_type: canonicalEventType,
              template_key: template.key,
              message: template.config_json?.message || '',
              channels: template.channels || ['sms', 'email'],
              reminder_type: 'main'
            };

            const mainJobResult = await createScheduledJob(
              businessId,
              template.id,
              mainReminderTime.toISOString(),
              mainJobPayload
            );

            if (mainJobResult.success) {
              console.log(`[ZAPIER_INGEST] Created main service reminder job for ${mainReminderTime.toISOString()}`);
            }

            // Follow-up reminders (7 days and 30 days after service)
            const followUpDays = [7, 30];
            for (const days of followUpDays) {
              const followUpTime = new Date(normalizedPayload.service_date);
              followUpTime.setDate(followUpTime.getDate() + days);

              const followUpJobPayload = {
                ...mainJobPayload,
                reminder_type: 'followup',
                follow_up_days: days
              };

              const followUpJobResult = await createScheduledJob(
                businessId,
                template.id,
                followUpTime.toISOString(),
                followUpJobPayload
              );

              if (followUpJobResult.success) {
                console.log(`[ZAPIER_INGEST] Created ${days}-day follow-up reminder job for ${followUpTime.toISOString()}`);
              }
            }
          }
          processed = true;
        }
      }
    }

    // Update last_webhook_at for the business
    const { error: updateError } = await supabase
      .from('business_integrations')
      .update({ last_webhook_at: new Date().toISOString() })
      .eq('business_id', businessId)
      .eq('provider', 'zapier');

    if (updateError) {
      console.error('[ZAPIER_INGEST] Error updating last_webhook_at:', updateError);
    }

    // Log the accepted event
    console.log(`[ZAPIER_INGEST] Event processed successfully: ${canonicalEventType} for business: ${businessId}, processed: ${processed}`);

    // Always return 200 to prevent Zapier retries
    res.status(200).json({ 
      success: true, 
      message: 'Event processed successfully',
      event_type: canonicalEventType,
      business_id: businessId,
      customer_id: customer?.id || null,
      processed,
      idempotency_key: idempotencyKey
    });

  } catch (error) {
    console.error('[ZAPIER_INGEST] Unexpected error:', error);
    // Still return 200 to prevent Zapier retries
    res.status(200).json({ 
      success: false, 
      error: 'Internal server error',
      message: 'Event processing failed but will not be retried'
    });
  }
});

// API endpoint to fetch templates for a business
app.get('/api/templates/:business_id', async (req, res) => {
  try {
    const { business_id } = req.params;

    if (!business_id) {
      return res.status(400).json({ error: 'business_id is required' });
    }

    console.log(`[API] Fetching templates for business: ${business_id}`);
    
    const { data: templates, error } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', business_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API] Error fetching templates:', error);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }

    return res.status(200).json({
      success: true,
      templates: templates || []
    });

  } catch (error) {
    console.error('[API] Error in fetch templates endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// API endpoint to update template status
app.put('/api/templates/:template_id/status', async (req, res) => {
  try {
    const { template_id } = req.params;
    const { status } = req.body;

    if (!template_id || !status) {
      return res.status(400).json({ error: 'template_id and status are required' });
    }

    if (!['ready', 'active', 'paused'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be ready, active, or paused' });
    }

    console.log(`[API] Updating template ${template_id} status to: ${status}`);
    
    const { data: template, error } = await supabase
      .from('automation_templates')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', template_id)
      .select()
      .single();

    if (error) {
      console.error('[API] Error updating template status:', error);
      return res.status(500).json({ error: 'Failed to update template status' });
    }

    // Handle Enable/Pause behavior with proper scheduling
    if (status === 'active') {
      console.log(`[API] Enabling template: ${template.name} (${template.trigger_type})`);
      
      // Create automation sequence record for active templates
      const { data: existingSequence, error: sequenceCheckError } = await supabase
        .from('automation_sequences')
        .select('id')
        .eq('template_id', template_id)
        .eq('business_id', template.business_id)
        .single();

      if (sequenceCheckError && sequenceCheckError.code !== 'PGRST116') {
        console.error('[API] Error checking for existing sequence:', sequenceCheckError);
      } else if (!existingSequence) {
        // Create new automation sequence
        const { data: newSequence, error: sequenceCreateError } = await supabase
          .from('automation_sequences')
          .insert({
            template_id: template_id,
            business_id: template.business_id,
            key: template.key,
            name: template.name,
            status: 'active',
            trigger_type: template.trigger_type,
            config_json: template.config_json || {}
          })
          .select('id')
          .single();

        if (sequenceCreateError) {
          console.error('[API] Error creating automation sequence:', sequenceCreateError);
        } else {
          console.log('[API] Created automation sequence:', newSequence.id);
        }
      } else {
        // Update existing sequence to active
        const { error: sequenceUpdateError } = await supabase
          .from('automation_sequences')
          .update({ status: 'active' })
          .eq('id', existingSequence.id);

        if (sequenceUpdateError) {
          console.error('[API] Error updating automation sequence:', sequenceUpdateError);
        } else {
          console.log('[API] Updated automation sequence to active:', existingSequence.id);
        }
      }
      
      // For date_based templates (service_reminder), create scheduled jobs for existing customers
      if (template.trigger_type === 'date_based') {
        console.log(`[API] Creating scheduled jobs for date_based template: ${template.name}`);
        
        // Get customers with future service dates
        const { data: customers, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .eq('business_id', template.business_id)
          .not('service_date', 'is', null)
          .gte('service_date', new Date().toISOString());

        if (!customersError && customers && customers.length > 0) {
          console.log(`[API] Found ${customers.length} customers with future service dates`);
          
          for (const customer of customers) {
            const serviceDate = new Date(customer.service_date);
            const config = template.config_json || {};
            const followUps = config.follow_ups || [];
            
            // Create main reminder job (24 hours after service)
            const mainReminderTime = new Date(serviceDate);
            mainReminderTime.setDate(mainReminderTime.getDate() + 1);
            
            const mainJobPayload = {
              customer_id: customer.id,
              customer_name: customer.full_name,
              customer_email: customer.email,
              customer_phone: customer.phone,
              event_type: 'service_reminder',
              template_key: template.key,
              service_date: customer.service_date,
              message: config.message || '',
              channels: template.channels || ['sms', 'email'],
              reminder_type: 'main'
            };

            // Create main reminder job with duplicate prevention
            const mainJobResult = await createScheduledJobWithDeduplication(
              template.business_id,
              template.id,
              mainReminderTime.toISOString(),
              mainJobPayload
            );

            if (mainJobResult.success) {
              console.log(`[API] Created main service reminder job for customer ${customer.email} at ${mainReminderTime.toISOString()}`);
            } else if (mainJobResult.duplicate) {
              console.log(`[API] Skipped duplicate main reminder job for customer ${customer.email}`);
            }

            // Create follow-up jobs (7 days and 30 days after service)
            const followUpDays = [7, 30];
            for (const days of followUpDays) {
              const followUpTime = new Date(serviceDate);
              followUpTime.setDate(followUpTime.getDate() + days);

              const followUpPayload = {
                ...mainJobPayload,
                reminder_type: 'followup',
                follow_up_days: days
              };

              const followUpJobResult = await createScheduledJobWithDeduplication(
                template.business_id,
                template.id,
                followUpTime.toISOString(),
                followUpPayload
              );

              if (followUpJobResult.success) {
                console.log(`[API] Created ${days}-day follow-up reminder job for customer ${customer.email} at ${followUpTime.toISOString()}`);
              } else if (followUpJobResult.duplicate) {
                console.log(`[API] Skipped duplicate ${days}-day follow-up job for customer ${customer.email}`);
              }
            }
          }
        }
      } else {
        // For event_based templates (job_completed, invoice_paid), do not create future jobs
        // Jobs will be created when matching ingest events are received
        console.log(`[API] Template ${template.name} is event_based - jobs will be created on matching events`);
      }
    } else if (status === 'paused') {
      console.log(`[API] Pausing template: ${template.name}`);
      
      // Update automation sequence to paused
      const { error: sequencePauseError } = await supabase
        .from('automation_sequences')
        .update({ status: 'paused' })
        .eq('template_id', template_id)
        .eq('business_id', template.business_id);

      if (sequencePauseError) {
        console.error('[API] Error pausing automation sequence:', sequencePauseError);
      } else {
        console.log('[API] Paused automation sequence for template:', template.name);
      }
      
      // Existing pending jobs remain but will be skipped by the worker with "paused" reason
      console.log(`[API] Existing pending jobs for template ${template.name} will be skipped by worker`);
    }

    return res.status(200).json({
      success: true,
      template: template
    });

  } catch (error) {
    console.error('[API] Error in update template status endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});
// API endpoint to fetch active sequences
// Add alias for the frontend hook
app.get('/api/active-sequences/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch active sequences for the business
    const { data: sequences, error } = await supabase
      .from('automation_sequences')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching active sequences:', error);
      return res.status(500).json({ error: 'Failed to fetch active sequences' });
    }

    return res.status(200).json({
      success: true,
      sequences: sequences || []
    });

  } catch (error) {
    console.error('Error in active sequences API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to update sequence status
app.put('/api/active-sequences/:sequenceId/status', async (req, res) => {
  try {
    const { sequenceId } = req.params;
    const { status } = req.body;

    if (!sequenceId || !status) {
      return res.status(400).json({ error: 'Sequence ID and status are required' });
    }

    if (!['active', 'paused', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be active, paused, completed, or failed' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update sequence status
    const { data: sequence, error } = await supabase
      .from('automation_sequences')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', sequenceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating sequence status:', error);
      return res.status(500).json({ error: 'Failed to update sequence status' });
    }

    return res.status(200).json({
      success: true,
      sequence: sequence
    });

  } catch (error) {
    console.error('Error in sequence status API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/sequences/active/:business_id', async (req, res) => {
  try {
    const { business_id } = req.params;

    if (!business_id) {
      return res.status(400).json({ error: 'business_id is required' });
    }

    console.log(`[API] Fetching active sequences for business: ${business_id}`);
    
    const { data: sequences, error } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', business_id)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API] Error fetching active sequences:', error);
      return res.status(500).json({ error: 'Failed to fetch active sequences' });
    }

    return res.status(200).json({
      success: true,
      sequences: sequences || []
    });

  } catch (error) {
    console.error('[API] Error in fetch active sequences endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// API endpoint to fetch automation logs
app.get('/api/automation-logs', async (req, res) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Find business by user email
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('created_by', user.email)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    console.log(`[API] Fetching automation logs for business: ${business.id}`);
    
    // Fetch automation logs with related data
    const { data: logs, error: logsError } = await supabase
      .from('automation_logs')
      .select(`
        *,
        customers:customer_id (
          id,
          full_name,
          email,
          phone
        ),
        sequences:sequence_id (
          id,
          name
        )
      `)
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (logsError) {
      console.error('[API] Error fetching automation logs:', logsError);
      return res.status(500).json({ error: 'Failed to fetch automation logs' });
    }

    // Transform logs to match frontend expected format
    const transformedLogs = logs.map(log => ({
      id: log.id,
      event_type: log.level === 'info' ? 'message_sent' : 
                  log.level === 'error' ? 'message_failed' : 
                  log.level === 'sent' ? 'message_delivered' : 'info',
      channel: log.metadata?.channel || 'email', // Default to email if not specified
      sequence_name: log.sequences?.name || 'Unknown Sequence',
      customer_email: log.customers?.email,
      customer_phone: log.customers?.phone,
      customer_id: log.customer_id,
      sequence_id: log.sequence_id,
      created_at: log.created_at,
      details: log.metadata || {}
    }));

    return res.status(200).json({
      ok: true,
      logs: transformedLogs
    });

  } catch (error) {
    console.error('[API] Error in fetch automation logs endpoint:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'Internal server error' 
    });
  }
});

// API endpoint to create custom automation sequences
app.post('/api/sequences', async (req, res) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Find business by user email
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('created_by', user.email)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const {
      name,
      description,
      trigger_type,
      trigger_event_type,
      allow_manual_enroll,
      quiet_hours_start,
      quiet_hours_end,
      rate_limit,
      status,
      steps
    } = req.body;

    console.log(`[API] Creating custom sequence for business: ${business.id}`);

    // Create the automation sequence
    const { data: sequence, error: sequenceError } = await supabase
      .from('automation_sequences')
      .insert({
        business_id: business.id,
        name,
        key: name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now(),
        status: status || 'active',
        trigger_type: trigger_type || 'manual',
        channels: ['email', 'sms'], // Default channels
        config_json: {
          description,
          trigger_event_type,
          allow_manual_enroll,
          quiet_hours_start,
          quiet_hours_end,
          rate_limit,
          steps: steps || []
        }
      })
      .select()
      .single();

    if (sequenceError) {
      console.error('[API] Error creating sequence:', sequenceError);
      return res.status(500).json({ error: 'Failed to create sequence' });
    }

    console.log('[API] Successfully created custom sequence:', sequence.id);

    return res.status(200).json({
      ok: true,
      sequence: sequence
    });

  } catch (error) {
    console.error('[API] Error in create sequence endpoint:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'Internal server error' 
    });
  }
});

// API endpoint to pause a sequence
app.post('/api/sequences/:sequenceId/pause', async (req, res) => {
  try {
    const { sequenceId } = req.params;

    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Find business by user email
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('created_by', user.email)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Update sequence status to paused
    const { data: sequence, error: updateError } = await supabase
      .from('automation_sequences')
      .update({ status: 'paused' })
      .eq('id', sequenceId)
      .eq('business_id', business.id)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error pausing sequence:', updateError);
      return res.status(500).json({ error: 'Failed to pause sequence' });
    }

    return res.status(200).json({
      ok: true,
      sequence: sequence
    });

  } catch (error) {
    console.error('[API] Error in pause sequence endpoint:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'Internal server error' 
    });
  }
});

// API endpoint to resume a sequence
app.post('/api/sequences/:sequenceId/resume', async (req, res) => {
  try {
    const { sequenceId } = req.params;

    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Find business by user email
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('created_by', user.email)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Update sequence status to active
    const { data: sequence, error: updateError } = await supabase
      .from('automation_sequences')
      .update({ status: 'active' })
      .eq('id', sequenceId)
      .eq('business_id', business.id)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error resuming sequence:', updateError);
      return res.status(500).json({ error: 'Failed to resume sequence' });
    }

    return res.status(200).json({
      ok: true,
      sequence: sequence
    });

  } catch (error) {
    console.error('[API] Error in resume sequence endpoint:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'Internal server error' 
    });
  }
});

// API endpoint to duplicate a sequence
app.post('/api/sequences/:sequenceId/duplicate', async (req, res) => {
  try {
    const { sequenceId } = req.params;

    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Find business by user email
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('created_by', user.email)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get the original sequence
    const { data: originalSequence, error: fetchError } = await supabase
      .from('automation_sequences')
      .select('*')
      .eq('id', sequenceId)
      .eq('business_id', business.id)
      .single();

    if (fetchError || !originalSequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    // Create a duplicate with a new name and key
    const duplicateData = {
      business_id: business.id,
      name: `${originalSequence.name} (Copy)`,
      key: originalSequence.key + '_copy_' + Date.now(),
      status: 'paused', // Start as paused
      trigger_type: originalSequence.trigger_type,
      channels: originalSequence.channels,
      config_json: originalSequence.config_json
    };

    const { data: duplicateSequence, error: createError } = await supabase
      .from('automation_sequences')
      .insert(duplicateData)
      .select()
      .single();

    if (createError) {
      console.error('[API] Error duplicating sequence:', createError);
      return res.status(500).json({ error: 'Failed to duplicate sequence' });
    }

    return res.status(200).json({
      ok: true,
      sequence: duplicateSequence
    });

  } catch (error) {
    console.error('[API] Error in duplicate sequence endpoint:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'Internal server error' 
    });
  }
});

// API endpoint to archive a sequence
app.post('/api/sequences/:sequenceId/archive', async (req, res) => {
  try {
    const { sequenceId } = req.params;

    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Find business by user email
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('created_by', user.email)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Update sequence status to archived
    const { data: sequence, error: updateError } = await supabase
      .from('automation_sequences')
      .update({ status: 'archived' })
      .eq('id', sequenceId)
      .eq('business_id', business.id)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error archiving sequence:', updateError);
      return res.status(500).json({ error: 'Failed to archive sequence' });
    }

    return res.status(200).json({
      ok: true,
      sequence: sequence
    });

  } catch (error) {
    console.error('[API] Error in archive sequence endpoint:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'Internal server error' 
    });
  }
});

// API endpoint to fetch automation KPIs
app.get('/api/automation/kpis/:business_id', async (req, res) => {
  try {
    const { business_id } = req.params;

    if (!business_id) {
      return res.status(400).json({ error: 'business_id is required' });
    }

    console.log(`[API] Fetching automation KPIs for business: ${business_id}`);
    
    // Get active sequences count
    const { data: activeSequences, error: sequencesError } = await supabase
      .from('automation_templates')
      .select('id')
      .eq('business_id', business_id)
      .eq('status', 'active');

    if (sequencesError) {
      console.error('[API] Error fetching active sequences count:', sequencesError);
      return res.status(500).json({ error: 'Failed to fetch active sequences count' });
    }

    const activeSequencesCount = activeSequences?.length || 0;

    // Get send statistics from automation_logs for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoIso = sevenDaysAgo.toISOString();

    const { data: logs, error: logsError } = await supabase
      .from('automation_logs')
      .select('level, message, created_at')
      .eq('business_id', business_id)
      .gte('created_at', sevenDaysAgoIso);

    if (logsError) {
      console.error('[API] Error fetching automation logs:', logsError);
      return res.status(500).json({ error: 'Failed to fetch automation logs' });
    }

    // Calculate enhanced send statistics
    const sentLogs = logs?.filter(log => log.level === 'sent') || [];
    const failedLogs = logs?.filter(log => log.level === 'failed') || [];
    const skippedLogs = logs?.filter(log => log.level === 'skipped') || [];
    const rateLimitedLogs = logs?.filter(log => log.level === 'rate_limited') || [];
    
    const messagesSent = sentLogs.length;
    const messagesSkipped = skippedLogs.length + rateLimitedLogs.length;
    const totalAttempts = sentLogs.length + failedLogs.length + skippedLogs.length + rateLimitedLogs.length;
    
    const sendSuccessRate = totalAttempts > 0 ? Math.round((messagesSent / totalAttempts) * 100) : 0;
    const failureRate = totalAttempts > 0 ? Math.round((failedLogs.length / totalAttempts) * 100) : 0;

    // Get total recipients (customers count)
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', business_id);

    if (customersError) {
      console.error('[API] Error fetching customers count:', customersError);
      return res.status(500).json({ error: 'Failed to fetch customers count' });
    }

    const totalRecipients = customers?.length || 0;

    // Get customers in sequences (customers who have been processed by automations)
    const { data: customersInSequences, error: customersInSeqError } = await supabase
      .from('automation_logs')
      .select('customer_id')
      .eq('business_id', business_id)
      .gte('created_at', sevenDaysAgoIso)
      .not('customer_id', 'is', null);

    if (customersInSeqError) {
      console.error('[API] Error fetching customers in sequences:', customersInSeqError);
    }

    // Calculate conversion rate (placeholder - would need review data to calculate actual conversion)
    const conversionRate7d = 0; // TODO: Calculate actual conversion rate from reviews

    const kpis = {
      // Frontend expects these field names
      activeSequences: activeSequencesCount,
      sendSuccessRate: sendSuccessRate,
      failureRate: failureRate,
      totalRecipients: totalRecipients,
      totalSends: messagesSent,
      successfulSends: messagesSent,
      failedSends: failedLogs.length,
      customersInSequences: customersInSequences?.length || 0,
      conversionRate7d: conversionRate7d,
      hasData: totalAttempts > 0,
      
      // Keep original field names for backward compatibility
      active_sequences_count: activeSequencesCount,
      send_success_pct: sendSuccessRate,
      failure_rate_pct: failureRate,
      messages_sent: messagesSent,
      messages_skipped: messagesSkipped,
      total_recipients: totalRecipients
    };

    return res.status(200).json({
      success: true,
      kpis: kpis
    });

  } catch (error) {
    console.error('[API] Error in fetch automation KPIs endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Helper functions for enhanced worker features

// Worker lock management
async function acquireWorkerLock(workerId) {
  try {
    // Clean up expired locks first
    await supabase
      .from('worker_locks')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Try to acquire lock
    const { data, error } = await supabase
      .from('worker_locks')
      .insert({
        worker_id: workerId,
        locked_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      })
      .select()
      .single();

    if (error) {
      console.log('[WORKER_LOCK] Failed to acquire lock:', error.message);
      return false;
    }

    console.log(`[WORKER_LOCK] Acquired lock with ID: ${data.id}`);
    return true;
  } catch (error) {
    console.error('[WORKER_LOCK] Error acquiring lock:', error);
    return false;
  }
}

async function releaseWorkerLock(workerId) {
  try {
    await supabase
      .from('worker_locks')
      .delete()
      .eq('worker_id', workerId);
    console.log(`[WORKER_LOCK] Released lock for worker: ${workerId}`);
  } catch (error) {
    console.error('[WORKER_LOCK] Error releasing lock:', error);
  }
}

// Quiet hours checking
async function checkQuietHours(business, businessId) {
  try {
    const now = new Date();
    const timezone = business.timezone || 'America/New_York';
    
    // Convert to business timezone
    const businessTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const currentHour = businessTime.getHours();
    const currentMinute = businessTime.getMinutes();
    const currentTime = currentHour * 60 + currentMinute; // minutes since midnight
    
    const startTime = business.quiet_hours_start || '20:00';
    const endTime = business.quiet_hours_end || '08:00';
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // Handle overnight quiet hours (e.g., 20:00 to 08:00)
    if (startMinutes > endMinutes) {
      if (currentTime >= startMinutes || currentTime < endMinutes) {
        // Calculate next allowed time (end of quiet hours today/tomorrow)
        const nextAllowed = new Date(businessTime);
        if (currentTime >= startMinutes) {
          // We're in the evening part, next allowed is tomorrow morning
          nextAllowed.setDate(nextAllowed.getDate() + 1);
        }
        nextAllowed.setHours(endHour, endMin, 0, 0);
        
        return {
          allowed: false,
          reason: `Within quiet hours (${startTime} - ${endTime})`,
          nextAllowedTime: nextAllowed.toISOString()
        };
      }
    } else {
      // Same day quiet hours
      if (currentTime >= startMinutes && currentTime < endMinutes) {
        const nextAllowed = new Date(businessTime);
        nextAllowed.setHours(endHour, endMin, 0, 0);
        
        return {
          allowed: false,
          reason: `Within quiet hours (${startTime} - ${endTime})`,
          nextAllowedTime: nextAllowed.toISOString()
        };
      }
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('[QUIET_HOURS] Error checking quiet hours:', error);
    return { allowed: true }; // Default to allowing if check fails
  }
}
// Rate limiting checking
async function checkRateLimits(template, businessId) {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Check template rate limits
    const { data: recentSends, error: sendsError } = await supabase
      .from('automation_logs')
      .select('id')
      .eq('business_id', businessId)
      .eq('template_id', template.id)
      .eq('level', 'sent')
      .gte('created_at', oneHourAgo.toISOString());
    
    if (sendsError) {
      console.error('[RATE_LIMIT] Error checking recent sends:', sendsError);
      return { allowed: true };
    }
    
    const hourlyCount = recentSends?.length || 0;
    const ratePerHour = template.rate_per_hour || 50;
    
    if (hourlyCount >= ratePerHour) {
      const nextAllowed = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      return {
        allowed: false,
        reason: `Template hourly rate limit exceeded (${hourlyCount}/${ratePerHour})`,
        nextAllowedTime: nextAllowed.toISOString()
      };
    }
    
    // Check daily rate limits
    const { data: dailySends, error: dailyError } = await supabase
      .from('automation_logs')
      .select('id')
      .eq('business_id', businessId)
      .eq('template_id', template.id)
      .eq('level', 'sent')
      .gte('created_at', oneDayAgo.toISOString());
    
    if (dailyError) {
      console.error('[RATE_LIMIT] Error checking daily sends:', dailyError);
      return { allowed: true };
    }
    
    const dailyCount = dailySends?.length || 0;
    const ratePerDay = template.rate_per_day || 500;
    
    if (dailyCount >= ratePerDay) {
      const nextAllowed = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      return {
        allowed: false,
        reason: `Template daily rate limit exceeded (${dailyCount}/${ratePerDay})`,
        nextAllowedTime: nextAllowed.toISOString()
      };
    }
    
    // Check business daily cap
    const { data: businessDailySends, error: businessError } = await supabase
      .from('automation_logs')
      .select('id')
      .eq('business_id', businessId)
      .eq('level', 'sent')
      .gte('created_at', oneDayAgo.toISOString());
    
    if (businessError) {
      console.error('[RATE_LIMIT] Error checking business daily sends:', businessError);
      return { allowed: true };
    }
    
    const businessDailyCount = businessDailySends?.length || 0;
    const dailyCap = 1000; // Default daily cap, should come from business settings
    
    if (businessDailyCount >= dailyCap) {
      const nextAllowed = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      return {
        allowed: false,
        reason: `Business daily cap exceeded (${businessDailyCount}/${dailyCap})`,
        nextAllowedTime: nextAllowed.toISOString()
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('[RATE_LIMIT] Error checking rate limits:', error);
    return { allowed: true }; // Default to allowing if check fails
  }
}

// Consent checking
async function checkConsent(payload, businessId) {
  try {
    const customerId = payload.customer_id;
    const channels = payload.channels || ['sms', 'email'];
    
    if (!customerId) {
      return { allowed: false, reason: 'No customer ID in payload' };
    }
    
    // Get customer consent data
    const { data: customer, error } = await supabase
      .from('customers')
      .select('sms_consent, email_consent, opted_out')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single();
    
    if (error || !customer) {
      return { allowed: false, reason: 'Customer not found' };
    }
    
    // Check if customer has opted out
    if (customer.opted_out) {
      return { allowed: false, reason: 'Customer has opted out' };
    }
    
    // Check channel-specific consent
    for (const channel of channels) {
      if (channel === 'sms' && !customer.sms_consent) {
        return { allowed: false, reason: 'No SMS consent' };
      }
      if (channel === 'email' && !customer.email_consent) {
        return { allowed: false, reason: 'No email consent' };
      }
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('[CONSENT] Error checking consent:', error);
    return { allowed: false, reason: 'Consent check failed' };
  }
}

// Helper functions for job management
async function skipJob(jobId, reason) {
  await supabase
    .from('scheduled_jobs')
    .update({ 
      status: 'skipped',
      error_message: reason,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

async function deferJob(jobId, nextAllowedTime) {
  await supabase
    .from('scheduled_jobs')
    .update({ 
      run_at: nextAllowedTime,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

// Logging function for automation events
async function logAutomationEvent(businessId, templateId, level, message) {
  try {
    await supabase
      .from('automation_logs')
      .insert({
        business_id: businessId,
        template_id: templateId,
        level: level,
        message: message,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('[AUTOMATION_LOGS] Error logging event:', error);
  }
}

// Worker endpoint to process scheduled jobs
app.post('/api/worker/run', async (req, res) => {
  const workerId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Simple security check - in production, use proper API key or JWT
    const workerKey = req.headers['x-worker-key'];
    if (workerKey !== process.env.WORKER_KEY) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    console.log(`[WORKER] Starting job processing with worker ID: ${workerId}`);
    
    // Acquire worker lock to prevent concurrent runs
    const lockAcquired = await acquireWorkerLock(workerId);
    if (!lockAcquired) {
      console.log('[WORKER] Another worker is already running, skipping this run');
      return res.status(200).json({ 
        success: true, 
        processed: 0, 
        message: 'Another worker is already running' 
      });
    }

    try {
      // Get pending jobs that are due with business and template data
      const now = new Date().toISOString();
      const { data: jobs, error: jobsError } = await supabase
        .from('scheduled_jobs')
        .select(`
          *,
          automation_templates!inner(
            id,
            name,
            status,
            rate_per_hour,
            rate_per_day,
            business_id,
            businesses!inner(
              id,
              quiet_hours_start,
              quiet_hours_end,
              daily_cap,
              timezone
            )
          )
        `)
        .eq('status', 'pending')
        .lte('run_at', now)
        .order('run_at', { ascending: true })
        .limit(10); // Process up to 10 jobs at a time

      if (jobsError) {
        console.error('[WORKER] Error fetching jobs:', jobsError);
        return res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
      }

      if (!jobs || jobs.length === 0) {
        console.log('[WORKER] No pending jobs found');
        return res.status(200).json({ success: true, processed: 0, message: 'No jobs to process' });
      }

      console.log(`[WORKER] Processing ${jobs.length} jobs`);

      let processed = 0;
      let failed = 0;
      let skipped = 0;
      let rateLimited = 0;

      for (const job of jobs) {
        try {
          const template = job.automation_templates;
          const business = template.businesses;

          // Check if template is paused
          if (template.status === 'paused') {
            console.log(`[WORKER] Skipping job ${job.id} - template "${template.name}" is paused`);
            await skipJob(job.id, 'Template is paused');
            await logAutomationEvent(job.business_id, job.template_id, 'skipped', 'Template is paused');
            skipped++;
            continue;
          }

          // Check quiet hours
          const quietHoursCheck = await checkQuietHours(business, job.business_id);
          if (!quietHoursCheck.allowed) {
            console.log(`[WORKER] Deferring job ${job.id} - within quiet hours (${quietHoursCheck.reason})`);
            await deferJob(job.id, quietHoursCheck.nextAllowedTime);
            skipped++;
            continue;
          }

          // Check rate limits
          const rateLimitCheck = await checkRateLimits(template, job.business_id);
          if (!rateLimitCheck.allowed) {
            console.log(`[WORKER] Rate limiting job ${job.id} - ${rateLimitCheck.reason}`);
            await deferJob(job.id, rateLimitCheck.nextAllowedTime);
            await logAutomationEvent(job.business_id, job.template_id, 'rate_limited', rateLimitCheck.reason);
            rateLimited++;
            continue;
          }

          // Check consent
          const consentCheck = await checkConsent(job.payload, job.business_id);
          if (!consentCheck.allowed) {
            console.log(`[WORKER] Skipping job ${job.id} - ${consentCheck.reason}`);
            await skipJob(job.id, consentCheck.reason);
            await logAutomationEvent(job.business_id, job.template_id, 'skipped', consentCheck.reason);
            skipped++;
            continue;
          }

          // Mark job as processing
          await supabase
            .from('scheduled_jobs')
            .update({ 
              status: 'processing',
              attempts: job.attempts + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          // Process the job
          const result = await processJob(job);
          
          if (result.success) {
            // Mark as done and update template timestamps
            await supabase
              .from('scheduled_jobs')
              .update({ 
                status: 'done',
                processed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id);

            // Update template last_sent_at
            await supabase
              .from('automation_templates')
              .update({
                last_sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', job.template_id);

            // Log successful send
            await logAutomationEvent(job.business_id, job.template_id, 'sent', 'Message sent successfully');
            
            processed++;
            console.log(`[WORKER] Successfully processed job ${job.id}`);
          } else {
            throw new Error(result.error);
          }

        } catch (error) {
          console.error(`[WORKER] Error processing job ${job.id}:`, error);
          
          // Log failed attempt
          await logAutomationEvent(job.business_id, job.template_id, 'failed', error.message);
          
          // Check if we should retry or mark as failed
          const newAttempts = job.attempts + 1;
          if (newAttempts >= job.max_attempts) {
            // Mark as failed
            await supabase
              .from('scheduled_jobs')
              .update({ 
                status: 'failed',
                error_message: error.message,
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id);
            
            failed++;
          } else {
            // Reset to pending for retry
            await supabase
              .from('scheduled_jobs')
              .update({ 
                status: 'pending',
                attempts: newAttempts,
                error_message: error.message,
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id);
          }
        }
      }

      console.log(`[WORKER] Completed processing: ${processed} successful, ${failed} failed, ${skipped} skipped, ${rateLimited} rate limited`);
      
      return res.status(200).json({ 
        success: true, 
        processed: processed,
        failed: failed,
        skipped: skipped,
        rateLimited: rateLimited,
        message: `Processed ${processed} jobs, ${failed} failed, ${skipped} skipped, ${rateLimited} rate limited`
      });

    } finally {
      // Always release the worker lock
      await releaseWorkerLock(workerId);
    }

  } catch (error) {
    console.error('[WORKER] Unexpected error in worker:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Helper function to process individual jobs
async function processJob(job) {
  try {
    const payload = job.payload;

    // Get template data if template_id exists
    let template = null;
    if (job.template_id) {
      const { data: templateData, error: templateError } = await supabase
        .from('automation_templates')
        .select('*')
        .eq('id', job.template_id)
        .single();
      
      if (!templateError && templateData) {
        template = templateData;
      }
    }

    // Get customer data from payload or fetch if needed
    let customer = {
      id: payload.customer_id,
      full_name: payload.customer_name,
      email: payload.customer_email,
      phone: payload.customer_phone
    };

    // If we don't have customer data in payload, try to fetch it
    if (!customer.id && payload.customer_id) {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', payload.customer_id)
        .single();
      
      if (!customerError && customerData) {
        customer = customerData;
      }
    }

    if (!customer.id) {
      throw new Error('Missing customer data for job');
    }

    const templateName = template ? template.name : payload.template_key || 'Unknown Template';
    console.log(`[WORKER] Processing job ${job.id} for template ${templateName}`);

    // Send messages based on channels
    const channels = payload.channels || (template ? template.channels : ['sms', 'email']);
    const results = [];

    for (const channel of channels) {
      try {
        if (channel === 'sms' && customer.phone) {
          // Send SMS
          const smsResult = await sendSMS(customer.phone, payload.message, job.business_id);
          results.push({ channel: 'sms', success: smsResult.success, error: smsResult.error });
        } else if (channel === 'email' && customer.email) {
          // Send Email
          const emailResult = await sendEmail(customer.email, payload.message, job.business_id);
          results.push({ channel: 'email', success: emailResult.success, error: emailResult.error });
        }
      } catch (error) {
        console.error(`[WORKER] Error sending ${channel}:`, error);
        results.push({ channel, success: false, error: error.message });
      }
    }

    // Log the job execution
    await supabase
      .from('automation_logs')
      .insert({
        business_id: job.business_id,
        level: 'info',
        message: `Job executed for ${templateName} - ${payload.template_key}`,
        metadata: {
          job_id: job.id,
          template_id: job.template_id,
          customer_id: customer.id,
          channels: channels,
          results: results,
          executed_at: new Date().toISOString()
        }
      });

    return { success: true, results };

  } catch (error) {
    console.error('[WORKER] Error in processJob:', error);
    return { success: false, error: error.message };
  }
}

// Helper functions for sending messages (placeholder implementations)
async function sendSMS(phone, message, businessId) {
  // TODO: Implement actual SMS sending (Twilio, etc.)
  console.log(`[SMS] Would send to ${phone}: ${message}`);
  return { success: true, messageId: `sms_${Date.now()}` };
}

async function sendEmail(email, message, businessId) {
  // TODO: Implement actual email sending (Resend, etc.)
  console.log(`[EMAIL] Would send to ${email}: ${message}`);
  return { success: true, messageId: `email_${Date.now()}` };
}

// API endpoint to get webhook secret for Zapier integration
// Real webhook endpoint for Zapier automation processing
app.post('/api/zapier/automation-webhook', async (req, res) => {
  try {
    console.log('[WEBHOOK] Received automation webhook:', req.body);
    
    const { customer_data, event_type, business_id } = req.body;
    
    if (!customer_data || !event_type) {
      return res.status(400).json({ error: 'Missing customer_data or event_type' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Save/update customer in database
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .upsert({
        business_id: business_id,
        full_name: customer_data.full_name || customer_data.name,
        email: customer_data.email,
        phone: customer_data.phone,
        source: 'zapier',
        external_id: customer_data.external_id || customer_data.id,
        tags: customer_data.tags || [],
        created_by: business_id // This should be the business owner's user_id
      }, {
        onConflict: 'business_id,email'
      })
      .select()
      .single();

    if (customerError) {
      console.error('[WEBHOOK] Error saving customer:', customerError);
      return res.status(500).json({ error: 'Failed to save customer' });
    }

    console.log('[WEBHOOK] Customer saved:', customer.id);

    // 2. Find active automation sequences for this business and event type
    const { data: sequences, error: sequencesError } = await supabase
      .from('automation_sequences')
      .select('*')
      .eq('business_id', business_id)
      .eq('status', 'active')
      .contains('config_json->trigger_events', [event_type]);

    if (sequencesError) {
      console.error('[WEBHOOK] Error fetching sequences:', sequencesError);
      return res.status(500).json({ error: 'Failed to fetch sequences' });
    }

    console.log('[WEBHOOK] Found active sequences:', sequences?.length || 0);

    // 3. Process each active sequence
    for (const sequence of sequences || []) {
      try {
        await processAutomationSequence(customer, sequence, supabase);
      } catch (error) {
        console.error('[WEBHOOK] Error processing sequence:', sequence.id, error);
        // Continue with other sequences even if one fails
      }
    }

    return res.status(200).json({
      success: true,
      customer_id: customer.id,
      sequences_processed: sequences?.length || 0
    });

  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to process automation sequences
async function processAutomationSequence(customer, sequence, supabase) {
  console.log('[AUTOMATION] Processing sequence:', sequence.name, 'for customer:', customer.full_name);
  
  // Import Resend
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  // Create email template
  const emailTemplate = createAutomationEmailTemplate(customer, sequence);
  
  // Send email via Resend
  try {
    const { data, error } = await resend.emails.send({
      from: 'Blipp <noreply@myblipp.com>',
      to: [customer.email],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    console.log('[AUTOMATION] Email sent successfully:', data.id);

    // Log the automation execution
    await supabase
      .from('automation_logs')
      .insert({
        business_id: customer.business_id,
        customer_id: customer.id,
        sequence_id: sequence.id,
        event_type: 'email_sent',
        status: 'success',
        message_id: data.id,
        recipient_email: customer.email
      });

  } catch (error) {
    console.error('[AUTOMATION] Email failed:', error);
    
    // Log the failed execution
    await supabase
      .from('automation_logs')
      .insert({
        business_id: customer.business_id,
        customer_id: customer.id,
        sequence_id: sequence.id,
        event_type: 'email_failed',
        status: 'failed',
        error_message: error.message,
        recipient_email: customer.email
      });
    
    throw error;
  }
}

// Helper function to create email templates
function createAutomationEmailTemplate(customer, sequence) {
  const { full_name, email } = customer;
  const { name, config_json } = sequence;
  
  // Default template
  const defaultTemplate = {
    subject: `Thank you for your business, ${full_name}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1A73E8;">Thank you for your business!</h2>
        <p>Hi ${full_name},</p>
        <p>We hope you're satisfied with our service! We'd love to hear about your experience.</p>
        <p>Could you take a moment to leave us a review? It really helps our business grow.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://g.page/r/your-review-link" 
             style="background: #1A73E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Leave a Review
          </a>
        </div>
        <p>Thank you for choosing us!</p>
        <p>Best regards,<br>The Team</p>
      </div>
    `
  };

  // Use custom template if available
  const emailConfig = config_json?.email_template || defaultTemplate;
  
  return {
    subject: emailConfig.subject,
    html: emailConfig.html
  };
}

app.get('/api/zapier/webhook-secret', async (req, res) => {
  try {
    // Get user from auth header or session
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user's business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('created_by', user.id)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get Zapier integration
    const { data: integration, error: integrationError } = await supabase
      .from('business_integrations')
      .select('metadata_json')
      .eq('business_id', business.id)
      .eq('provider', 'zapier')
      .eq('status', 'active')
      .single();

    if (integrationError || !integration) {
      return res.status(404).json({ error: 'Zapier integration not found' });
    }

    const secret = integration.metadata_json?.webhook_secret;
    if (!secret) {
      return res.status(404).json({ error: 'Webhook secret not configured' });
    }

    return res.status(200).json({ secret });

  } catch (error) {
    console.error('[API] Error fetching webhook secret:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Health endpoint for system monitoring
app.get('/api/health', async (req, res) => {
  try {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    
    // Get pending jobs due
    const { data: pendingJobs, error: jobsError } = await supabase
      .from('scheduled_jobs')
      .select('id')
      .eq('status', 'pending')
      .lte('run_at', now.toISOString());

    if (jobsError) {
      console.error('[HEALTH] Error fetching pending jobs:', jobsError);
    }

    // Get last worker run time
    const { data: lastWorkerRun, error: workerError } = await supabase
      .from('worker_locks')
      .select('locked_at')
      .order('locked_at', { ascending: false })
      .limit(1)
      .single();

    if (workerError && workerError.code !== 'PGRST116') {
      console.error('[HEALTH] Error fetching last worker run:', workerError);
    }

    // Get last webhook times per business
    const { data: webhookTimes, error: webhookError } = await supabase
      .from('business_integrations')
      .select('business_id, last_webhook_at')
      .not('last_webhook_at', 'is', null)
      .order('last_webhook_at', { ascending: false });

    if (webhookError) {
      console.error('[HEALTH] Error fetching webhook times:', webhookError);
    }

    const health = {
      pending_jobs_due: pendingJobs?.length || 0,
      last_worker_run_at: lastWorkerRun?.locked_at || null,
      last_webhook_at: webhookTimes?.length > 0 ? webhookTimes[0].last_webhook_at : null,
      queue_depth: pendingJobs?.length || 0,
      status: 'healthy',
      timestamp: now.toISOString()
    };

    // Check for warnings
    const warnings = [];
    if (health.queue_depth > 0 && health.last_worker_run_at) {
      const lastRun = new Date(health.last_worker_run_at);
      if (lastRun < twoMinutesAgo) {
        warnings.push('Worker appears stalled - queue has pending jobs but no recent worker activity');
        health.status = 'warning';
      }
    }

    if (warnings.length > 0) {
      health.warnings = warnings;
    }

    return res.status(200).json({
      success: true,
      health: health
    });

  } catch (error) {
    console.error('[HEALTH] Error in health endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      health: {
        status: 'error',
        timestamp: new Date().toISOString()
      }
    });
  }
});
// API endpoint to test provisionDefaultTemplates
app.post('/api/templates/provision-defaults', async (req, res) => {
  try {
    const { business_id } = req.body;

    if (!business_id) {
      return res.status(400).json({ error: 'business_id is required' });
    }

    console.log(`[API] Provisioning default templates for business: ${business_id}`);
    
    const result = await provisionDefaultTemplates(business_id);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: `Successfully provisioned ${result.total} templates`,
        templates: result.created
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('[API] Error in provision-defaults endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Owner-only admin endpoints

// Reset default templates for a business
app.post('/api/templates/reset-defaults', async (req, res) => {
  try {
    const { business_id } = req.query;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authorization required' });
    }

    // Verify user is owner
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Check if user is owner (you may need to implement owner role checking)
    // For now, we'll check if they created the business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, created_by')
      .eq('id', business_id)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    if (business.created_by !== user.id) {
      return res.status(403).json({ success: false, error: 'Access denied - owner only' });
    }

    if (!business_id) {
      return res.status(400).json({ success: false, error: 'business_id is required' });
    }

    console.log(`[ADMIN] Resetting default templates for business: ${business_id}`);

    // Delete existing default templates
    const { error: deleteError } = await supabase
      .from('automation_templates')
      .delete()
      .eq('business_id', business_id)
      .in('key', ['job_completed', 'invoice_paid', 'service_reminder']);

    if (deleteError) {
      console.error('[ADMIN] Error deleting existing templates:', deleteError);
      return res.status(500).json({ success: false, error: 'Failed to delete existing templates' });
    }

    // Re-provision default templates
    const result = await provisionDefaultTemplates(business_id);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: `Successfully reset and provisioned ${result.total} default templates`,
        templates: result.created
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('[ADMIN] Error in reset-defaults endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// AI API Routes
// AI message generation
app.post('/api/ai/generate-message', async (req, res) => {
  try {
    const { template_name, template_type, business_id, automation_type } = req.body;

    if (!template_name || !business_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get business information for context
    let business = null;
    try {
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('name, business_type, description')
        .eq('id', business_id)
        .single();

      if (!businessError && businessData) {
        business = businessData;
      } else {
        console.log('Business not found, using fallback context');
      }
    } catch (error) {
      console.log('Business fetch error, using fallback context:', error.message);
    }

    // Create context-aware prompt based on automation type
    const getPrompt = (templateName, templateType, businessInfo) => {
      const businessContext = businessInfo ? `for ${businessInfo.name} (${businessInfo.business_type || 'business'})` : 'for a business';
      
      const prompts = {
        'job_completed': `Create a professional follow-up email ${businessContext} after a job/service is completed. The message should:
        - Thank the customer for choosing the business
        - Express hope that they were satisfied with the service
        - Politely request a review
        - Include {{customer.name}} and {{review_link}} variables
        - Be warm but professional
        - Keep it concise (2-3 sentences)`,
        
        'invoice_paid': `Create a professional thank you email ${businessContext} after an invoice is paid. The message should:
        - Thank the customer for their payment
        - Express appreciation for their business
        - Politely request a review
        - Include {{customer.name}} and {{review_link}} variables
        - Be warm but professional
        - Keep it concise (2-3 sentences)`,
        
        'service_reminder': `Create a friendly reminder email ${businessContext} for an upcoming service appointment. The message should:
        - Be warm and friendly
        - Remind them of their upcoming appointment
        - Express excitement to serve them
        - Include {{customer.name}} and {{service_date}} variables
        - Be professional but personable
        - Keep it concise (2-3 sentences)`
      };

      return prompts[templateType] || prompts[templateName?.toLowerCase()] || 
        `Create a professional email message ${businessContext} for a ${templateName} automation. Include {{customer.name}} and {{review_link}} variables.`;
    };

    const prompt = getPrompt(template_name, template_type, business);

    // Call OpenAI API
    if (!process.env.OPENAI_API_KEY) {
      console.log('[AI] OpenAI API key not found, using fallback message');
      throw new Error('OpenAI API key not configured');
    }

    console.log('[AI] Making OpenAI API request with key:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional email copywriter specializing in customer follow-up messages. Create clear, concise, and professional messages that maintain a warm tone while being respectful of the customer\'s time.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('[AI] OpenAI API error:', {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        body: errorData
      });
      throw new Error(`OpenAI API request failed: ${openaiResponse.status} ${openaiResponse.statusText}`);
    }

    const aiData = await openaiResponse.json();
    const generatedMessage = aiData.choices[0]?.message?.content?.trim();

    console.log('[AI] OpenAI API response successful:', {
      messageLength: generatedMessage?.length || 0,
      hasCustomerName: generatedMessage?.includes('{{customer.name}}') || false,
      hasReviewLink: generatedMessage?.includes('{{review_link}}') || false
    });

    if (!generatedMessage) {
      throw new Error('No message generated');
    }

    // Ensure variables are included if they weren't in the AI response
    let finalMessage = generatedMessage;
    if (!finalMessage.includes('{{customer.name}}')) {
      finalMessage = `{{customer.name}}, ${finalMessage}`;
    }
    if (!finalMessage.includes('{{review_link}}') && (template_type === 'job_completed' || template_type === 'invoice_paid')) {
      finalMessage += ' Please leave us a review at {{review_link}}.';
    }

    console.log('[AI] Sending successful response:', {
      template_name,
      template_type,
      messageLength: finalMessage.length,
      finalMessage: finalMessage.substring(0, 100) + '...'
    });

    res.status(200).json({
      success: true,
      message: finalMessage,
      template_name,
      template_type
    });

  } catch (error) {
    console.error('AI generation error:', error);
    
    // Check if it's a timeout error
    if (error.name === 'AbortError') {
      console.log('[AI] Request timed out, using fallback message');
    }
    
    // Fallback to default message if AI fails
    const fallbackMessages = {
      'job_completed': 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review at {{review_link}}.',
      'invoice_paid': 'Thank you for your payment, {{customer.name}}! We appreciate your business. Please consider leaving us a review at {{review_link}}.',
      'service_reminder': 'Hi {{customer.name}}, this is a friendly reminder about your upcoming service appointment. We look forward to serving you!'
    };

    const fallbackMessage = fallbackMessages[template_type] || 
      'Thank you for your business! Please leave us a review at {{review_link}}.';

    res.status(200).json({
      success: true,
      message: fallbackMessage,
      template_name,
      template_type,
      fallback: true,
      error: error.name === 'AbortError' ? 'Request timed out' : error.message
    });
  }
});

// AI message enhancement
app.post('/api/ai/enhance-message', async (req, res) => {
  try {
    const { current_message, template_name, template_type, business_id } = req.body;

    if (!current_message || !business_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get business information for context
    let business = null;
    try {
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('name, business_type, description')
        .eq('id', business_id)
        .single();

      if (!businessError && businessData) {
        business = businessData;
      } else {
        console.log('Business not found, using fallback context');
      }
    } catch (error) {
      console.log('Business fetch error, using fallback context:', error.message);
    }

    // Create enhancement prompt
    const getEnhancementPrompt = (currentMessage, templateName, templateType, businessInfo) => {
      const businessContext = businessInfo ? `for ${businessInfo.name} (${businessInfo.business_type || 'business'})` : 'for a business';
      
      return `Please enhance the following email message ${businessContext} to make it more professional and engaging while maintaining the original meaning and tone. Keep all variable placeholders like {{customer.name}} and {{review_link}} exactly as they are.

Current message: "${currentMessage}"

Please improve it by:
- Making it more professional and polished
- Improving the tone while keeping it warm
- Making it more engaging without being pushy
- Keep it concise (2-3 sentences)

Enhanced message:`;
    };

    const prompt = getEnhancementPrompt(current_message, template_name, template_type, business);

    // Call OpenAI API
    if (!process.env.OPENAI_API_KEY) {
      console.log('OpenAI API key not found, using fallback enhancement');
      throw new Error('OpenAI API key not configured');
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional email copywriter. Enhance messages to be more professional, engaging, and effective while maintaining the original meaning and tone. Always preserve variable placeholders like {{customer.name}} and {{review_link}} exactly as they are.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.5, // Lower temperature for more consistent enhancements
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error('OpenAI API request failed');
    }

    const aiData = await openaiResponse.json();
    const enhancedMessage = aiData.choices[0]?.message?.content?.trim();

    if (!enhancedMessage) {
      throw new Error('No enhanced message generated');
    }

    res.status(200).json({
      success: true,
      enhanced_message: enhancedMessage,
      template_name,
      template_type
    });

  } catch (error) {
    console.error('AI enhancement error:', error);
    
    // Check if it's a timeout error
    if (error.name === 'AbortError') {
      console.log('[AI] Enhancement request timed out, returning original message');
    }
    
    // Return original message if enhancement fails
    res.status(200).json({
      success: true,
      enhanced_message: current_message,
      template_name,
      template_type,
      fallback: true,
      error: error.name === 'AbortError' ? 'Request timed out' : error.message
    });
  }
});

// Customer preview data
app.post('/api/customers/preview-data', async (req, res) => {
  try {
    const { business_id } = req.body;

    if (!business_id) {
      return res.status(400).json({ error: 'business_id is required' });
    }

    // Get a sample customer for preview
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('name, email')
      .eq('business_id', business_id)
      .limit(1)
      .single();

    // Get business info
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', business_id)
      .single();

    const previewData = {
      customer_name: customer?.name || 'John Smith',
      customer_email: customer?.email || 'john.smith@example.com',
      business_name: business?.name || 'Your Business',
      service_date: '2024-01-15',
      amount: '$150.00',
      review_link: 'https://google.com/reviews/your-business'
    };

    res.status(200).json({
      success: true,
      preview_data: previewData
    });

  } catch (error) {
    console.error('Preview data error:', error);
    
    // Fallback preview data
    const fallbackData = {
      customer_name: 'John Smith',
      customer_email: 'john.smith@example.com',
      business_name: 'Your Business',
      service_date: '2024-01-15',
      amount: '$150.00',
      review_link: 'https://google.com/reviews/your-business'
    };

    res.status(200).json({
      success: true,
      preview_data: fallbackData
    });
  }
});

// Rotate HMAC secret for Zapier integration
app.post('/api/zapier/rotate-secret', async (req, res) => {
  try {
    const { business_id } = req.query;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authorization required' });
    }

    // Verify user is owner
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Check if user is owner
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, created_by')
      .eq('id', business_id)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    if (business.created_by !== user.id) {
      return res.status(403).json({ success: false, error: 'Access denied - owner only' });
    }

    if (!business_id) {
      return res.status(400).json({ success: false, error: 'business_id is required' });
    }

    console.log(`[ADMIN] Rotating HMAC secret for business: ${business_id}`);

    // Generate new secret
    const crypto = await import('crypto');
    const newSecret = crypto.randomBytes(32).toString('hex');

    // Update business integration
    const { data: integration, error: updateError } = await supabase
      .from('business_integrations')
      .update({
        metadata_json: {
          webhook_secret: newSecret,
          secret_rotated_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('business_id', business_id)
      .eq('provider', 'zapier')
      .select()
      .single();

    if (updateError) {
      console.error('[ADMIN] Error updating integration:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to update integration' });
    }

    return res.status(200).json({
      success: true,
      message: 'HMAC secret rotated successfully',
      webhook_secret: newSecret,
      rotated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ADMIN] Error in rotate-secret endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Rate limiting helpers
const rateLimitCache = new Map();

// Metrics tracking (in-memory for now)
const metricsCache = new Map();

// Metrics tracking functions
function incrementMetric(businessId, metricType) {
  const key = `${businessId}_${metricType}`;
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);
  
  if (!metricsCache.has(key)) {
    metricsCache.set(key, []);
  }
  
  const metrics = metricsCache.get(key);
  metrics.push(now);
  
  // Clean up old metrics (older than 5 minutes)
  const recentMetrics = metrics.filter(timestamp => timestamp > fiveMinutesAgo);
  metricsCache.set(key, recentMetrics);
  
  return recentMetrics.length;
}

function getFailureRate(businessId) {
  const sends = incrementMetric(businessId, 'sends');
  const failures = incrementMetric(businessId, 'failures');
  
  if (sends === 0) return 0;
  return (failures / sends) * 100;
}

function checkFailureThreshold(businessId) {
  const failureRate = getFailureRate(businessId);
  const threshold = parseFloat(process.env.FAILURE_THRESHOLD || '10'); // 10% default
  
  if (failureRate > threshold) {
    console.warn(`[ALERT] High failure rate for business ${businessId}: ${failureRate.toFixed(2)}%`);
    return true;
  }
  return false;
}
// Defaults initialization function
async function initializeDefaultsForBusiness(businessId) {
  try {
    console.log(`[DEFAULTS] Initializing defaults for business ${businessId}`);
    
    // Check if defaults are already initialized
    const { data: settings, error: settingsError } = await supabase
      .from('business_settings')
      .select('defaults_initialized')
      .eq('business_id', businessId)
      .single();
    
    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('[DEFAULTS] Error checking settings:', settingsError);
      return false;
    }
    
    if (settings && settings.defaults_initialized) {
      console.log(`[DEFAULTS] Defaults already initialized for business ${businessId}`);
      return true;
    }
    
    // Create default message templates first
    const { data: templates, error: templatesError } = await supabase
      .from('message_templates')
      .insert([
        {
          business_id: businessId,
          name: 'Review Request Email',
          channel: 'email',
          subject: 'How was your experience?',
          body: 'Hi {{customer_name}}, we hope you enjoyed our service! Could you please leave us a review?'
        },
        {
          business_id: businessId,
          name: 'Review Request SMS',
          channel: 'sms',
          body: 'Hi {{customer_name}}! How was your experience? Please leave us a review: {{review_url}}'
        },
        {
          business_id: businessId,
          name: 'Service Reminder SMS',
          channel: 'sms',
          body: 'Hi {{customer_name}}, your service is scheduled for {{service_date}}. Please leave us a review after your visit!'
        }
      ])
      .select();
    
    if (templatesError) {
      console.error('[DEFAULTS] Error creating templates:', templatesError);
      return false;
    }
    
    console.log(`[DEFAULTS] Created ${templates.length} message templates`);
    
    // Create default sequences
    const { data: sequences, error: sequencesError } = await supabase
      .from('sequences')
      .insert([
        {
          business_id: businessId,
          name: 'Job Completed Review Request',
          status: 'active',
          trigger_event_type: 'job_completed',
          allow_manual_enroll: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          rate_per_hour: 50,
          rate_per_day: 500
        },
        {
          business_id: businessId,
          name: 'Invoice Paid Follow-up',
          status: 'active',
          trigger_event_type: 'invoice_paid',
          allow_manual_enroll: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          rate_per_hour: 50,
          rate_per_day: 500
        },
        {
          business_id: businessId,
          name: 'Service Reminder',
          status: 'active',
          trigger_event_type: 'service_scheduled',
          allow_manual_enroll: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          rate_per_hour: 25,
          rate_per_day: 250
        }
      ])
      .select();
    
    if (sequencesError) {
      console.error('[DEFAULTS] Error creating sequences:', sequencesError);
      return false;
    }
    
    console.log(`[DEFAULTS] Created ${sequences.length} sequences`);
    
    // Create sequence steps for each sequence
    const stepsToCreate = [];
    
    // Job Completed sequence: Email (5h delay) → SMS (48h delay if no review)
    stepsToCreate.push(
      {
        sequence_id: sequences[0].id,
        business_id: businessId,
        step_order: 1,
        step_type: 'wait',
        step_config: { hours: 5 }
      },
      {
        sequence_id: sequences[0].id,
        business_id: businessId,
        step_order: 2,
        step_type: 'send_email',
        step_config: { 
          template_id: templates[0].id,
          subject: 'How was your experience?'
        }
      },
      {
        sequence_id: sequences[0].id,
        business_id: businessId,
        step_order: 3,
        step_type: 'wait',
        step_config: { hours: 48 }
      },
      {
        sequence_id: sequences[0].id,
        business_id: businessId,
        step_order: 4,
        step_type: 'send_sms',
        step_config: { 
          template_id: templates[1].id,
          condition: 'no_review_left'
        }
      }
    );
    
    // Invoice Paid sequence: Email (3h delay)
    stepsToCreate.push(
      {
        sequence_id: sequences[1].id,
        business_id: businessId,
        step_order: 1,
        step_type: 'wait',
        step_config: { hours: 3 }
      },
      {
        sequence_id: sequences[1].id,
        business_id: businessId,
        step_order: 2,
        step_type: 'send_email',
        step_config: { 
          template_id: templates[0].id,
          subject: 'Thank you for your payment!'
        }
      }
    );
    
    // Service Reminder sequence: SMS (24h before service)
    stepsToCreate.push(
      {
        sequence_id: sequences[2].id,
        business_id: businessId,
        step_order: 1,
        step_type: 'wait',
        step_config: { hours: -24, condition: 'before_service_date' }
      },
      {
        sequence_id: sequences[2].id,
        business_id: businessId,
        step_order: 2,
        step_type: 'send_sms',
        step_config: { 
          template_id: templates[2].id
        }
      }
    );
    
    const { data: steps, error: stepsError } = await supabase
      .from('sequence_steps')
      .insert(stepsToCreate)
      .select();
    
    if (stepsError) {
      console.error('[DEFAULTS] Error creating steps:', stepsError);
      return false;
    }
    
    console.log(`[DEFAULTS] Created ${steps.length} sequence steps`);
    
    // Update or create business_settings record
    const { error: updateError } = await supabase
      .from('business_settings')
      .upsert({
        business_id: businessId,
        defaults_initialized: true,
        defaults_initialized_at: new Date().toISOString()
      });
    
    if (updateError) {
      console.error('[DEFAULTS] Error updating settings:', updateError);
      return false;
    }
    
    // Log the initialization
    await logAutomationEvent(
      businessId,
      'info',
      'trigger',
      'Default sequences and templates initialized',
      {
        sequences_created: sequences.length,
        templates_created: templates.length,
        steps_created: steps.length
      }
    );
    
    console.log(`[DEFAULTS] Successfully initialized defaults for business ${businessId}`);
    return true;
    
  } catch (error) {
    console.error('[DEFAULTS] Error initializing defaults:', error);
    return false;
  }
}

function getRateLimitKey(businessId, type) {
  const now = new Date();
  const hourKey = `${businessId}_${type}_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}_${now.getHours()}`;
  const dayKey = `${businessId}_${type}_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;
  return { hourKey, dayKey };
}

function checkRateLimit(businessId, ratePerHour, ratePerDay) {
  const { hourKey, dayKey } = getRateLimitKey(businessId, 'messages');
  
  const hourCount = rateLimitCache.get(hourKey) || 0;
  const dayCount = rateLimitCache.get(dayKey) || 0;
  
  // Default rate limits if not specified
  const effectiveRatePerHour = ratePerHour || 1000; // Default 1000 per hour
  const effectiveRatePerDay = ratePerDay || 10000; // Default 10000 per day
  
  if (hourCount >= effectiveRatePerHour) {
    return { 
      allowed: false, 
      reason: 'hourly_rate_limit', 
      current: hourCount, 
      limit: effectiveRatePerHour,
      resetTime: new Date(Date.now() + (60 - new Date().getMinutes()) * 60 * 1000).toISOString()
    };
  }
  
  if (dayCount >= effectiveRatePerDay) {
    return { 
      allowed: false, 
      reason: 'daily_rate_limit', 
      current: dayCount, 
      limit: effectiveRatePerDay,
      resetTime: new Date(Date.now() + (24 - new Date().getHours()) * 60 * 60 * 1000).toISOString()
    };
  }
  
  return { 
    allowed: true, 
    current: { hour: hourCount, day: dayCount },
    limits: { hour: effectiveRatePerHour, day: effectiveRatePerDay }
  };
}

function incrementRateLimit(businessId) {
  const { hourKey, dayKey } = getRateLimitKey(businessId, 'messages');
  
  const hourCount = (rateLimitCache.get(hourKey) || 0) + 1;
  const dayCount = (rateLimitCache.get(dayKey) || 0) + 1;
  
  rateLimitCache.set(hourKey, hourCount);
  rateLimitCache.set(dayKey, dayCount);
  
  // Clean up old entries (keep last 24 hours)
  const cutoff = Date.now() - (24 * 60 * 60 * 1000);
  for (const [key, value] of rateLimitCache.entries()) {
    if (value.timestamp && value.timestamp < cutoff) {
      rateLimitCache.delete(key);
    }
  }
}

// Get safety rules summary for a business
async function getSafetyRulesSummary(businessId) {
  try {
    const { data: business, error } = await supabase
      .from('businesses')
      .select('rate_per_hour, rate_per_day, timezone')
      .eq('id', businessId)
      .single();

    if (error || !business) {
      return {
        rateLimits: { hourly: 'Not configured', daily: 'Not configured' },
        cooldown: { days: parseInt(process.env.COOLDOWN_DAYS || '7') },
        timezone: 'UTC',
        quietHours: { enabled: false }
      };
    }

    return {
      rateLimits: {
        hourly: business.rate_per_hour || 'Unlimited',
        daily: business.rate_per_day || 'Unlimited'
      },
      cooldown: {
        days: parseInt(process.env.COOLDOWN_DAYS || '7')
      },
      timezone: business.timezone || 'UTC',
      quietHours: {
        enabled: false // Will be overridden by sequence-specific settings
      }
    };
  } catch (error) {
    console.error('[SAFETY] Error getting safety rules summary:', error);
    return {
      rateLimits: { hourly: 'Error', daily: 'Error' },
      cooldown: { days: 7 },
      timezone: 'UTC',
      quietHours: { enabled: false }
    };
  }
}

// Helper function to check if customer can receive messages
async function canSendToCustomer(customerId, businessId) {
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('unsubscribed, dnc, hard_bounced, last_review_request_at, full_name, email')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single();

    if (error || !customer) {
      console.log('[SAFETY] Customer not found:', customerId, 'Error:', error?.message);
      return { 
        canSend: false, 
        reason: 'Customer not found',
        details: { customer_id: customerId, error: error?.message }
      };
    }

    // Check if customer is unsubscribed
    if (customer.unsubscribed) {
      console.log('[SAFETY] Customer unsubscribed:', customerId, 'Name:', customer.full_name);
      return { 
        canSend: false, 
        reason: 'Customer unsubscribed',
        details: { 
          customer_id: customerId, 
          customer_name: customer.full_name,
          customer_email: customer.email
        }
      };
    }

    // Check if customer is on DNC list
    if (customer.dnc) {
      console.log('[SAFETY] Customer on DNC list:', customerId, 'Name:', customer.full_name);
      return { 
        canSend: false, 
        reason: 'Customer on DNC list',
        details: { 
          customer_id: customerId, 
          customer_name: customer.full_name,
          customer_email: customer.email
        }
      };
    }

    // Check if customer has hard bounced
    if (customer.hard_bounced) {
      console.log('[SAFETY] Customer hard bounced:', customerId, 'Name:', customer.full_name);
      return { 
        canSend: false, 
        reason: 'Customer hard bounced',
        details: { 
          customer_id: customerId, 
          customer_name: customer.full_name,
          customer_email: customer.email
        }
      };
    }

    // Check cooldown period
    const cooldownDays = parseInt(process.env.COOLDOWN_DAYS || '7');
    if (customer.last_review_request_at) {
      const lastRequest = new Date(customer.last_review_request_at);
      const now = new Date();
      const daysSinceLastRequest = (now - lastRequest) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastRequest < cooldownDays) {
        const remainingDays = Math.ceil(cooldownDays - daysSinceLastRequest);
        console.log('[SAFETY] Customer in cooldown period:', customerId, 'Name:', customer.full_name, 'Days since last request:', daysSinceLastRequest.toFixed(2));
        return { 
          canSend: false, 
          reason: `Customer in cooldown period (${remainingDays} days remaining)`,
          details: { 
            customer_id: customerId, 
            customer_name: customer.full_name,
            customer_email: customer.email,
            last_request_at: customer.last_review_request_at,
            days_since_last_request: daysSinceLastRequest.toFixed(2),
            cooldown_days: cooldownDays,
            remaining_days: remainingDays
          }
        };
      }
    }

    return { 
      canSend: true,
      details: { 
        customer_id: customerId, 
        customer_name: customer.full_name,
        customer_email: customer.email,
        cooldown_days: cooldownDays
      }
    };
  } catch (error) {
    console.error('[SAFETY] Error checking customer safety:', error);
    return { 
      canSend: false, 
      reason: 'Safety check failed',
      details: { customer_id: customerId, error: error.message }
    };
  }
}

// Send message helper with provider adapters
async function sendMessage(messageData, dryRun = false) {
  try {
    // Check if customer can receive messages (only if customer_id is provided)
    if (messageData.customer_id && messageData.business_id) {
      const safetyCheck = await canSendToCustomer(messageData.customer_id, messageData.business_id);
      if (!safetyCheck.canSend) {
        console.log('[SAFETY] Blocked message send:', safetyCheck.reason, 'Details:', safetyCheck.details);
        return { 
          success: false, 
          blocked: true, 
          reason: safetyCheck.reason,
          details: safetyCheck.details
        };
      }
    }

    if (dryRun) {
      console.log('[DRY_RUN] Would send message:', {
        channel: messageData.channel,
        to: messageData.to,
        subject: messageData.subject,
        body: messageData.body?.substring(0, 100) + '...'
      });
      return { success: true, messageId: 'dry_run_' + Date.now() };
    }

    // TODO: Implement actual message sending
    // For now, just simulate success
    console.log('[SEND_MESSAGE] Sending message:', {
      channel: messageData.channel,
      to: messageData.to,
      subject: messageData.subject
    });
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Update customer's last review request timestamp if customer_id is provided
    if (messageData.customer_id && messageData.business_id) {
      await supabase
        .from('customers')
        .update({ 
          last_review_request_at: new Date().toISOString()
        })
        .eq('id', messageData.customer_id)
        .eq('business_id', messageData.business_id);
    }
    
    return { 
      success: true, 
      messageId: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    };
  } catch (error) {
    console.error('[SEND_MESSAGE] Error:', error);
    return { success: false, error: error.message };
  }
}

// Calculate next allowed time considering quiet hours and business timezone
function nextAllowedTime(now, quietHoursStart, quietHoursEnd, timezone = 'UTC') {
  const currentTime = new Date(now);
  
  // If no quiet hours configured, return current time
  if (!quietHoursStart || !quietHoursEnd) {
    return currentTime;
  }

  // Convert current time to business timezone
  const businessTime = new Date(currentTime.toLocaleString("en-US", { timeZone: timezone }));
  
  // Parse quiet hours
  const [startHour, startMin] = quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = quietHoursEnd.split(':').map(Number);
  
  // Create today's quiet hours boundaries in business timezone
  const todayStart = new Date(businessTime);
  todayStart.setHours(startHour, startMin, 0, 0);
  
  const todayEnd = new Date(businessTime);
  todayEnd.setHours(endHour, endMin, 0, 0);
  
  // Handle case where quiet hours span midnight (e.g., 22:00 to 08:00)
  if (todayStart > todayEnd) {
    // Quiet hours span midnight
    if (businessTime >= todayStart || businessTime <= todayEnd) {
      // Currently in quiet hours, return end of quiet hours
      // Convert back to UTC
      const endTimeUTC = new Date(todayEnd.toLocaleString("en-US", { timeZone: timezone }));
      return endTimeUTC;
    } else {
      // Not in quiet hours, return current time
      return currentTime;
    }
  } else {
    // Quiet hours within same day
    if (businessTime >= todayStart && businessTime <= todayEnd) {
      // Currently in quiet hours, return end of quiet hours
      // Convert back to UTC
      const endTimeUTC = new Date(todayEnd.toLocaleString("en-US", { timeZone: timezone }));
      return endTimeUTC;
    } else {
      // Not in quiet hours, return current time
      return currentTime;
    }
  }
}

// Calculate next run time with quiet hours
function calculateNextRunTime(sequence, currentStep, now = new Date()) {
  let nextRun = new Date(now);

  // If there's a wait step, add the wait time
  if (currentStep && currentStep.kind === 'wait' && currentStep.wait_ms) {
    nextRun = new Date(now.getTime() + currentStep.wait_ms);
  }

  // Apply quiet hours if configured
  if (sequence.quiet_hours_start && sequence.quiet_hours_end) {
    nextRun = nextAllowedTime(nextRun, sequence.quiet_hours_start, sequence.quiet_hours_end, sequence.timezone);
  }

  return nextRun.toISOString();
}

// Check exit rules for an enrollment
async function checkExitRules(enrollment, businessId) {
  try {
    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name, email, phone, status, review_left')
      .eq('id', enrollment.customer_id)
      .single();

    if (customerError) {
      console.error(`[EXIT_RULES] Error getting customer ${enrollment.customer_id}:`, customerError);
      return { shouldStop: false, reason: null };
    }

    // Check if customer has already left a review
    if (customer.review_left) {
      console.log(`[EXIT_RULES] Customer ${customer.email} has already left a review`);
      return { 
        shouldStop: true, 
        reason: 'review_left',
        message: 'Customer has already left a review'
      };
    }

    // Check if customer is unsubscribed or archived
    if (customer.status === 'unsubscribed' || customer.status === 'archived') {
      console.log(`[EXIT_RULES] Customer ${customer.email} is ${customer.status}`);
      return { 
        shouldStop: true, 
        reason: 'customer_status',
        message: `Customer is ${customer.status}`
      };
    }

    // Check if customer has unsubscribed from this specific sequence
    // This would require a separate unsubscribes table or field
    // For now, we'll check if there's a stop reason in the enrollment meta
    if (enrollment.meta && enrollment.meta.stop_reason) {
      console.log(`[EXIT_RULES] Enrollment ${enrollment.id} has stop reason: ${enrollment.meta.stop_reason}`);
      return { 
        shouldStop: true, 
        reason: 'enrollment_stopped',
        message: enrollment.meta.stop_reason
      };
    }

    return { shouldStop: false, reason: null };

  } catch (error) {
    console.error(`[EXIT_RULES] Error checking exit rules for enrollment ${enrollment.id}:`, error);
    return { shouldStop: false, reason: null };
  }
}
// Process a message step (send_email or send_sms)
async function processMessageStep(enrollment, sequence, business, currentStep, channel, now) {
  try {
    // Check rate limits
    const rateCheck = checkRateLimit(business.id, business.rate_per_hour, business.rate_per_day);
    if (!rateCheck.allowed) {
      console.log(`[PROCESS] Rate limit exceeded for business ${business.id}:`, rateCheck);
      
      // Reschedule for next hour/day
      const nextRun = new Date(now);
      if (rateCheck.reason === 'hourly_rate_limit') {
        nextRun.setHours(nextRun.getHours() + 1, 0, 0, 0);
      } else {
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(0, 0, 0, 0);
      }
      
      await logAutomationEvent(
        business.id,
        'warning',
        'runner',
        `Rate limit exceeded for enrollment ${enrollment.id}`,
        { 
          enrollment_id: enrollment.id, 
          reason: rateCheck.reason,
          current: rateCheck.current,
          limit: rateCheck.limit,
          next_run_at: nextRun.toISOString()
        }
      );
      
      return { success: false, nextRunAt: nextRun.toISOString() };
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('full_name, email, phone')
      .eq('id', enrollment.customer_id)
      .single();

    if (customerError) {
      console.error(`[PROCESS] Error getting customer ${enrollment.customer_id}:`, customerError);
      await logAutomationEvent(
        business.id,
        'error',
        'runner',
        `Failed to get customer for enrollment ${enrollment.id}`,
        { enrollment_id: enrollment.id, customer_id: enrollment.customer_id, error: customerError.message }
      );
      return { success: false };
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', currentStep.template_id)
      .single();

    if (templateError) {
      console.error(`[PROCESS] Error getting template ${currentStep.template_id}:`, templateError);
      await logAutomationEvent(
        business.id,
        'error',
        'runner',
        `Failed to get template for enrollment ${enrollment.id}`,
        { enrollment_id: enrollment.id, template_id: currentStep.template_id, error: templateError.message }
      );
      return { success: false };
    }

    // Create message record
    const messageData = {
      business_id: business.id,
      customer_id: enrollment.customer_id,
      sequence_id: sequence.id,
      enrollment_id: enrollment.id,
      channel: channel,
      to: channel === 'email' ? customer.email : customer.phone,
      subject: template.subject,
      body: template.body,
      status: 'queued',
      created_at: now.toISOString()
    };

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert(messageData)
      .select('id')
      .single();

    if (messageError) {
      console.error(`[PROCESS] Error creating message:`, messageError);
      await logAutomationEvent(
        business.id,
        'error',
        'runner',
        `Failed to create message for enrollment ${enrollment.id}`,
        { enrollment_id: enrollment.id, error: messageError.message }
      );
      return { success: false };
    }

    // Send message
    const sendResult = await sendMessage({
      channel: channel,
      to: messageData.to,
      subject: messageData.subject,
      body: messageData.body,
      customer_id: enrollment.customer_id,
      business_id: business.id
    }, process.env.DRY_RUN === 'true');

    if (sendResult.success) {
      // Update message status
      await supabase
        .from('messages')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
          external_id: sendResult.messageId
        })
        .eq('id', message.id);

      // Increment rate limit
      incrementRateLimit(business.id);

      // Track successful send
      incrementMetric(business.id, 'sends');

      console.log(`[PROCESS] Message sent successfully for enrollment ${enrollment.id}`);
      
      await logAutomationEvent(
        business.id,
        'info',
        'runner',
        `Message sent for enrollment ${enrollment.id}`,
        { 
          enrollment_id: enrollment.id, 
          message_id: message.id,
          channel: channel,
          step_index: enrollment.current_step_index
        }
      );
      
      return { success: true };
    } else if (sendResult.blocked) {
      // Message was blocked due to safety checks
      await supabase
        .from('messages')
        .update({ 
          status: 'blocked',
          error_message: sendResult.reason
        })
        .eq('id', message.id);

      // Stop the enrollment
      await supabase
        .from('sequence_enrollments')
        .update({ 
          status: 'stopped',
          stopped_at: new Date().toISOString()
        })
        .eq('id', enrollment.id);

      console.log(`[PROCESS] Message blocked for enrollment ${enrollment.id}: ${sendResult.reason}. Enrollment stopped. Details:`, sendResult.details);
      
      await logAutomationEvent(
        business.id,
        'info',
        'runner',
        `Message blocked for enrollment ${enrollment.id}: ${sendResult.reason}`,
        { 
          enrollment_id: enrollment.id, 
          message_id: message.id,
          channel: channel,
          step_index: enrollment.current_step_index,
          reason: sendResult.reason,
          safety_details: sendResult.details
        }
      );
      
      return { success: false, stopped: true };
    } else {
      // Mark message as failed
      await supabase
        .from('messages')
        .update({ 
          status: 'failed',
          error_message: sendResult.error
        })
        .eq('id', message.id);

      // Track failure
      incrementMetric(business.id, 'failures');
      
      // Check failure threshold
      const isHighFailureRate = checkFailureThreshold(business.id);

      console.error(`[PROCESS] Message send failed for enrollment ${enrollment.id}:`, sendResult.error);
      
      await logAutomationEvent(
        business.id,
        'error',
        'runner',
        `Message send failed for enrollment ${enrollment.id}`,
        { 
          enrollment_id: enrollment.id, 
          message_id: message.id,
          error: sendResult.error,
          high_failure_rate: isHighFailureRate
        }
      );
      
      return { success: false, highFailureRate: isHighFailureRate };
    }

  } catch (error) {
    console.error(`[PROCESS] Error processing message step for enrollment ${enrollment.id}:`, error);
    await logAutomationEvent(
      business.id,
      'error',
      'runner',
      `Error processing message step for enrollment ${enrollment.id}`,
      { enrollment_id: enrollment.id, error: error.message }
    );
    return { success: false };
  }
}

// Process a single enrollment
async function processEnrollment(enrollment, sequence, business) {
  try {
    console.log(`[PROCESS] Processing enrollment ${enrollment.id} for sequence ${sequence.name}`);
    
    // Check exit rules before processing
    const exitCheck = await checkExitRules(enrollment, business.id);
    if (exitCheck.shouldStop) {
      console.log(`[PROCESS] Stopping enrollment ${enrollment.id} due to exit rule: ${exitCheck.reason}`);
      
      // Update enrollment status to stopped
      await supabase
        .from('sequence_enrollments')
        .update({
          status: 'stopped',
          last_event_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          meta: {
            ...enrollment.meta,
            stop_reason: exitCheck.reason,
            stop_message: exitCheck.message,
            stopped_at: new Date().toISOString()
          }
        })
        .eq('id', enrollment.id);

      await logAutomationEvent(
        business.id,
        'info',
        'runner',
        `Enrollment stopped due to exit rule: ${exitCheck.reason}`,
        { 
          enrollment_id: enrollment.id, 
          reason: exitCheck.reason,
          message: exitCheck.message
        }
      );
      return;
    }
    
    // Get current step
    const { data: currentStep, error: stepError } = await supabase
      .from('sequence_steps')
      .select('*')
      .eq('sequence_id', sequence.id)
      .eq('step_index', enrollment.current_step_index)
      .single();

    if (stepError) {
      console.error(`[PROCESS] Error getting step ${enrollment.current_step_index}:`, stepError);
      await logAutomationEvent(
        business.id,
        'error',
        'runner',
        `Failed to get step ${enrollment.current_step_index} for enrollment ${enrollment.id}`,
        { enrollment_id: enrollment.id, step_index: enrollment.current_step_index, error: stepError.message }
      );
      return;
    }

    const now = new Date();
    let nextStepIndex = enrollment.current_step_index;
    let nextRunAt = null;
    let enrollmentStatus = 'active';

    if (currentStep.kind === 'wait') {
      // Wait step - just update next_run_at
      nextRunAt = calculateNextRunTime(sequence, currentStep, now);
      nextStepIndex += 1;
      
      console.log(`[PROCESS] Wait step completed, next run at ${nextRunAt}`);
      
      await logAutomationEvent(
        business.id,
        'info',
        'runner',
        `Wait step completed for enrollment ${enrollment.id}`,
        { 
          enrollment_id: enrollment.id, 
          step_index: enrollment.current_step_index,
          next_run_at: nextRunAt
        }
      );
      
    } else if (currentStep.kind === 'send_email' || currentStep.kind === 'send_sms') {
      // Send message step
      const channel = currentStep.kind === 'send_email' ? 'email' : 'sms';
      
      // Check if we're in quiet hours before sending
      if (sequence.quiet_hours_start && sequence.quiet_hours_end) {
        const nextAllowed = nextAllowedTime(now, sequence.quiet_hours_start, sequence.quiet_hours_end, sequence.timezone);
        if (nextAllowed.getTime() > now.getTime()) {
          console.log(`[PROCESS] Currently in quiet hours for enrollment ${enrollment.id}, rescheduling to ${nextAllowed.toISOString()}`);
          
          nextRunAt = nextAllowed.toISOString();
          
          await logAutomationEvent(
            business.id,
            'info',
            'runner',
            `Message delayed due to quiet hours for enrollment ${enrollment.id}`,
            { 
              enrollment_id: enrollment.id, 
              current_time: now.toISOString(),
              next_allowed: nextAllowed.toISOString(),
              quiet_hours: `${sequence.quiet_hours_start} - ${sequence.quiet_hours_end}`
            }
          );
        } else {
          // Not in quiet hours, proceed with sending
          const messageResult = await processMessageStep(enrollment, sequence, business, currentStep, channel, now);
          if (messageResult.success) {
            nextStepIndex += 1;
            nextRunAt = calculateNextRunTime(sequence, null, now);
          } else {
            return; // Error already logged in processMessageStep
          }
        }
      } else {
        // No quiet hours configured, proceed with sending
        const messageResult = await processMessageStep(enrollment, sequence, business, currentStep, channel, now);
        if (messageResult.success) {
          nextStepIndex += 1;
          nextRunAt = calculateNextRunTime(sequence, null, now);
        } else {
          return; // Error already logged in processMessageStep
        }
      }
    }

    // Check if we've reached the end of the sequence
    const { data: nextStep, error: nextStepError } = await supabase
      .from('sequence_steps')
      .select('id')
      .eq('sequence_id', sequence.id)
      .eq('step_index', nextStepIndex)
      .single();

    if (nextStepError && nextStepError.code === 'PGRST116') {
      // No more steps - mark enrollment as finished
      enrollmentStatus = 'finished';
      nextRunAt = null;
      
      console.log(`[PROCESS] Sequence completed for enrollment ${enrollment.id}`);
      
      await logAutomationEvent(
        business.id,
        'info',
        'runner',
        `Sequence completed for enrollment ${enrollment.id}`,
        { 
          enrollment_id: enrollment.id, 
          sequence_id: sequence.id,
          total_steps: enrollment.current_step_index + 1
        }
      );
    }

    // Update enrollment
    const updateData = {
      current_step_index: nextStepIndex,
      status: enrollmentStatus,
      last_event_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    if (nextRunAt) {
      updateData.next_run_at = nextRunAt;
    }

    const { error: updateError } = await supabase
      .from('sequence_enrollments')
      .update(updateData)
      .eq('id', enrollment.id);

    if (updateError) {
      console.error(`[PROCESS] Error updating enrollment ${enrollment.id}:`, updateError);
      await logAutomationEvent(
        business.id,
        'error',
        'runner',
        `Failed to update enrollment ${enrollment.id}`,
        { enrollment_id: enrollment.id, error: updateError.message }
      );
    }

  } catch (error) {
    console.error(`[PROCESS] Error processing enrollment ${enrollment.id}:`, error);
    await logAutomationEvent(
      business.id,
      'error',
      'runner',
      `Error processing enrollment ${enrollment.id}`,
      { enrollment_id: enrollment.id, error: error.message }
    );
  }
}

// Cron endpoints
app.post('/api/cron/automation-runner', async (req, res) => {
  try {
    // Validate cron secret
    const cronSecret = req.headers['x-cron-secret'];
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    console.log('[CRON] Starting automation runner...');

    // Get all businesses
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, name, rate_per_hour, rate_per_day');

    if (businessesError) {
      console.error('[CRON] Error getting businesses:', businessesError);
      return res.status(500).json({ ok: false, error: 'Failed to get businesses' });
    }

    let totalProcessed = 0;
    let totalErrors = 0;

    // Process each business
    for (const business of businesses) {
      try {
        console.log(`[CRON] Processing business ${business.name} (${business.id})`);

        // Get due enrollments for this business
        const now = new Date().toISOString();
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('sequence_enrollments')
          .select(`
            id,
            sequence_id,
            customer_id,
            current_step_index,
            next_run_at,
            sequences!inner(
              id,
              name,
              quiet_hours_start,
              quiet_hours_end
            )
          `)
          .eq('business_id', business.id)
          .eq('status', 'active')
          .lte('next_run_at', now)
          .limit(200);

        if (enrollmentsError) {
          console.error(`[CRON] Error getting enrollments for business ${business.id}:`, enrollmentsError);
          continue;
        }

        if (!enrollments || enrollments.length === 0) {
          console.log(`[CRON] No due enrollments for business ${business.name}`);
          continue;
        }

        console.log(`[CRON] Found ${enrollments.length} due enrollments for business ${business.name}`);

        // Process each enrollment
        for (const enrollment of enrollments) {
          try {
            await processEnrollment(enrollment, enrollment.sequences, business);
            totalProcessed++;
          } catch (error) {
            console.error(`[CRON] Error processing enrollment ${enrollment.id}:`, error);
            totalErrors++;
          }
        }

      } catch (error) {
        console.error(`[CRON] Error processing business ${business.id}:`, error);
        totalErrors++;
      }
    }

    console.log(`[CRON] Automation runner completed. Processed: ${totalProcessed}, Errors: ${totalErrors}`);

    return res.status(200).json({ 
      ok: true, 
      processed: totalProcessed,
      errors: totalErrors,
      businesses: businesses.length
    });

  } catch (error) {
    console.error('[CRON] Automation runner error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Sequences API endpoints
app.get('/api/sequences', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    // Get sequences with step counts and enrollment stats
    const { data: sequences, error: sequencesError } = await supabase
      .from('sequences')
      .select(`
        id,
        name,
        status,
        trigger_event_type,
        allow_manual_enroll,
        quiet_hours_start,
        quiet_hours_end,
        rate_per_hour,
        rate_per_day,
        created_at,
        updated_at,
        sequence_steps!inner(
          id,
          kind,
          step_index,
          wait_ms,
          template_id
        )
      `)
      .eq('business_id', profile.business_id)
      .order('created_at', { ascending: false });

    if (sequencesError) {
      console.error('[SEQUENCES] Error fetching sequences:', sequencesError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch sequences' });
    }

    // Get enrollment counts for each sequence
    const sequenceIds = sequences.map(s => s.id);
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('sequence_enrollments')
      .select('sequence_id, status')
      .in('sequence_id', sequenceIds);

    if (enrollmentsError) {
      console.error('[SEQUENCES] Error fetching enrollments:', enrollmentsError);
    }

    // Process sequences with stats
    const sequencesWithStats = sequences.map(sequence => {
      const sequenceEnrollments = enrollments?.filter(e => e.sequence_id === sequence.id) || [];
      const activeEnrollments = sequenceEnrollments.filter(e => e.status === 'active').length;
      const finishedEnrollments = sequenceEnrollments.filter(e => e.status === 'finished').length;
      const stoppedEnrollments = sequenceEnrollments.filter(e => e.status === 'stopped').length;

      // Get step summary
      const steps = sequence.sequence_steps || [];
      const stepSummary = steps.map(step => ({
        kind: step.kind,
        step_index: step.step_index,
        wait_ms: step.wait_ms
      })).sort((a, b) => a.step_index - b.step_index);

      // Get last sent date from messages
      const lastSentDate = null; // TODO: Implement last sent tracking

      return {
        id: sequence.id,
        name: sequence.name,
        status: sequence.status,
        trigger_event_type: sequence.trigger_event_type,
        allow_manual_enroll: sequence.allow_manual_enroll,
        quiet_hours_start: sequence.quiet_hours_start,
        quiet_hours_end: sequence.quiet_hours_end,
        rate_per_hour: sequence.rate_per_hour,
        rate_per_day: sequence.rate_per_day,
        created_at: sequence.created_at,
        updated_at: sequence.updated_at,
        step_count: steps.length,
        step_summary: stepSummary,
        active_enrollments: activeEnrollments,
        finished_enrollments: finishedEnrollments,
        stopped_enrollments: stoppedEnrollments,
        total_enrollments: sequenceEnrollments.length,
        last_sent: lastSentDate
      };
    });

    res.json({ ok: true, sequences: sequencesWithStats });

  } catch (error) {
    console.error('[SEQUENCES] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

app.post('/api/sequences/:id/pause', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const sequenceId = req.params.id;

    // Update sequence status to paused
    const { error: updateError } = await supabase
      .from('sequences')
      .update({ 
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('id', sequenceId)
      .eq('business_id', profile.business_id);

    if (updateError) {
      console.error('[SEQUENCES] Error pausing sequence:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to pause sequence' });
    }

    res.json({ ok: true, message: 'Sequence paused successfully' });

  } catch (error) {
    console.error('[SEQUENCES] Error pausing sequence:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

app.post('/api/sequences/:id/resume', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const sequenceId = req.params.id;

    // Update sequence status to active
    const { error: updateError } = await supabase
      .from('sequences')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', sequenceId)
      .eq('business_id', profile.business_id);

    if (updateError) {
      console.error('[SEQUENCES] Error resuming sequence:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to resume sequence' });
    }

    res.json({ ok: true, message: 'Sequence resumed successfully' });

  } catch (error) {
    console.error('[SEQUENCES] Error resuming sequence:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});
app.post('/api/sequences/:id/duplicate', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const sequenceId = req.params.id;

    // Get original sequence
    const { data: originalSequence, error: sequenceError } = await supabase
      .from('sequences')
      .select('*')
      .eq('id', sequenceId)
      .eq('business_id', profile.business_id)
      .single();

    if (sequenceError || !originalSequence) {
      return res.status(404).json({ ok: false, error: 'Sequence not found' });
    }

    // Get original steps
    const { data: originalSteps, error: stepsError } = await supabase
      .from('sequence_steps')
      .select('*')
      .eq('sequence_id', sequenceId)
      .order('step_index');

    if (stepsError) {
      console.error('[SEQUENCES] Error fetching steps:', stepsError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch steps' });
    }

    // Create duplicate sequence
    const duplicateSequence = {
      business_id: profile.business_id,
      name: `${originalSequence.name} (Copy)`,
      status: 'draft',
      trigger_event_type: originalSequence.trigger_event_type,
      allow_manual_enroll: originalSequence.allow_manual_enroll,
      quiet_hours_start: originalSequence.quiet_hours_start,
      quiet_hours_end: originalSequence.quiet_hours_end,
      rate_per_hour: originalSequence.rate_per_hour,
      rate_per_day: originalSequence.rate_per_day,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newSequence, error: createError } = await supabase
      .from('sequences')
      .insert(duplicateSequence)
      .select('id')
      .single();

    if (createError) {
      console.error('[SEQUENCES] Error creating duplicate sequence:', createError);
      return res.status(500).json({ ok: false, error: 'Failed to create duplicate sequence' });
    }

    // Duplicate steps
    if (originalSteps && originalSteps.length > 0) {
      const duplicateSteps = originalSteps.map(step => ({
        sequence_id: newSequence.id,
        kind: step.kind,
        step_index: step.step_index,
        wait_ms: step.wait_ms,
        template_id: step.template_id,
        created_at: new Date().toISOString()
      }));

      const { error: stepsCreateError } = await supabase
        .from('sequence_steps')
        .insert(duplicateSteps);

      if (stepsCreateError) {
        console.error('[SEQUENCES] Error creating duplicate steps:', stepsCreateError);
        // Don't fail the whole operation, just log the error
      }
    }

    res.json({ 
      ok: true, 
      message: 'Sequence duplicated successfully',
      new_sequence_id: newSequence.id
    });

  } catch (error) {
    console.error('[SEQUENCES] Error duplicating sequence:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

app.post('/api/sequences/:id/archive', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const sequenceId = req.params.id;

    // Update sequence status to archived
    const { error: updateError } = await supabase
      .from('sequences')
      .update({ 
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', sequenceId)
      .eq('business_id', profile.business_id);

    if (updateError) {
      console.error('[SEQUENCES] Error archiving sequence:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to archive sequence' });
    }

    res.json({ ok: true, message: 'Sequence archived successfully' });

  } catch (error) {
    console.error('[SEQUENCES] Error archiving sequence:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Create new sequence
app.post('/api/sequences', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const { name, trigger_event_type, allow_manual_enroll, quiet_hours_start, quiet_hours_end, rate_per_hour, rate_per_day } = req.body;

    // Validate required fields
    if (!name || !trigger_event_type) {
      return res.status(400).json({ ok: false, error: 'Name and trigger_event_type are required' });
    }

    // Create sequence
    const sequenceData = {
      business_id: profile.business_id,
      name,
      status: 'draft',
      trigger_event_type,
      allow_manual_enroll: allow_manual_enroll || false,
      quiet_hours_start: quiet_hours_start || null,
      quiet_hours_end: quiet_hours_end || null,
      rate_per_hour: rate_per_hour || null,
      rate_per_day: rate_per_day || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newSequence, error: createError } = await supabase
      .from('sequences')
      .insert(sequenceData)
      .select('*')
      .single();

    if (createError) {
      console.error('[SEQUENCES] Error creating sequence:', createError);
      return res.status(500).json({ ok: false, error: 'Failed to create sequence' });
    }

    res.json({ ok: true, sequence: newSequence });

  } catch (error) {
    console.error('[SEQUENCES] Error creating sequence:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Update sequence
app.patch('/api/sequences/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const sequenceId = req.params.id;
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.business_id;
    delete updateData.created_at;

    const { data: updatedSequence, error: updateError } = await supabase
      .from('sequences')
      .update(updateData)
      .eq('id', sequenceId)
      .eq('business_id', profile.business_id)
      .select('*')
      .single();

    if (updateError) {
      console.error('[SEQUENCES] Error updating sequence:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to update sequence' });
    }

    res.json({ ok: true, sequence: updatedSequence });

  } catch (error) {
    console.error('[SEQUENCES] Error updating sequence:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Test endpoint to trigger automation for a customer
app.post('/api/test-automation', async (req, res) => {
  try {
    const { customerId, businessId } = req.body;
    
    if (!customerId || !businessId) {
      return res.status(400).json({ error: 'customerId and businessId are required' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get active sequences for the business
    const { data: sequences, error: sequencesError } = await supabase
      .from('automation_sequences')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active');

    if (sequencesError) {
      return res.status(500).json({ error: 'Failed to fetch sequences' });
    }

    console.log(`[TEST] Found ${sequences?.length || 0} active sequences for customer ${customer.full_name}`);

    // Process each sequence
    const results = [];
    for (const sequence of sequences || []) {
      try {
        await processAutomationSequence(customer, sequence, supabase);
        results.push({ sequenceId: sequence.id, sequenceName: sequence.name, status: 'success' });
      } catch (error) {
        console.error('[TEST] Error processing sequence:', sequence.id, error);
        results.push({ sequenceId: sequence.id, sequenceName: sequence.name, status: 'error', error: error.message });
      }
    }

    res.json({ 
      success: true, 
      message: 'Automation test completed',
      customer: customer.full_name,
      sequencesProcessed: results.length,
      results: results
    });
    
  } catch (error) {
    console.error('Error testing automation:', error);
    res.status(500).json({ 
      error: 'Failed to test automation',
      details: error.message 
    });
  }
});

// Test endpoint to send a real email
app.post('/api/test-email', async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    
    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'to, subject, and message are required' });
    }

    // Check if Resend API key is available
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Initialize Resend
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send email via Resend
    const emailData = {
      from: 'Blipp <noreply@myblipp.com>',
      to: [to],
      subject: subject,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${subject}</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <p style="color: #666; font-size: 14px;">
          This is a test email from Blipp automation system.
        </p>
      </div>`
    };

    console.log('Sending test email to:', to);
    const emailResponse = await resend.emails.send(emailData);
    
    console.log('Test email sent:', emailResponse);
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully',
      emailId: emailResponse.data?.id 
    });
    
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: error.message 
    });
  }
});

// Get single sequence with steps
app.get('/api/sequences/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const sequenceId = req.params.id;

    // Get sequence with steps
    const { data: sequence, error: sequenceError } = await supabase
      .from('sequences')
      .select(`
        *,
        sequence_steps(
          id,
          kind,
          step_index,
          wait_ms,
          template_id,
          created_at
        )
      `)
      .eq('id', sequenceId)
      .eq('business_id', profile.business_id)
      .single();

    if (sequenceError || !sequence) {
      return res.status(404).json({ ok: false, error: 'Sequence not found' });
    }

    // Sort steps by step_index
    if (sequence.sequence_steps) {
      sequence.sequence_steps.sort((a, b) => a.step_index - b.step_index);
    }

    res.json({ ok: true, sequence });

  } catch (error) {
    console.error('[SEQUENCES] Error fetching sequence:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Create sequence step
app.post('/api/sequences/:id/steps', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const sequenceId = req.params.id;
    const { kind, step_index, wait_ms, template_id } = req.body;

    // Validate required fields
    if (!kind || step_index === undefined) {
      return res.status(400).json({ ok: false, error: 'Kind and step_index are required' });
    }

    // Verify sequence belongs to user
    const { data: sequence, error: sequenceError } = await supabase
      .from('sequences')
      .select('id')
      .eq('id', sequenceId)
      .eq('business_id', profile.business_id)
      .single();

    if (sequenceError || !sequence) {
      return res.status(404).json({ ok: false, error: 'Sequence not found' });
    }

    // Create step
    const stepData = {
      sequence_id: sequenceId,
      kind,
      step_index,
      wait_ms: wait_ms || null,
      template_id: template_id || null,
      created_at: new Date().toISOString()
    };

    const { data: newStep, error: createError } = await supabase
      .from('sequence_steps')
      .insert(stepData)
      .select('*')
      .single();

    if (createError) {
      console.error('[SEQUENCES] Error creating step:', createError);
      return res.status(500).json({ ok: false, error: 'Failed to create step' });
    }

    res.json({ ok: true, step: newStep });

  } catch (error) {
    console.error('[SEQUENCES] Error creating step:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Update sequence step
app.patch('/api/sequences/:id/steps/:stepId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const sequenceId = req.params.id;
    const stepId = req.params.stepId;
    const updateData = { ...req.body };

    // Verify sequence belongs to user
    const { data: sequence, error: sequenceError } = await supabase
      .from('sequences')
      .select('id')
      .eq('id', sequenceId)
      .eq('business_id', profile.business_id)
      .single();

    if (sequenceError || !sequence) {
      return res.status(404).json({ ok: false, error: 'Sequence not found' });
    }

    // Update step
    const { data: updatedStep, error: updateError } = await supabase
      .from('sequence_steps')
      .update(updateData)
      .eq('id', stepId)
      .eq('sequence_id', sequenceId)
      .select('*')
      .single();

    if (updateError) {
      console.error('[SEQUENCES] Error updating step:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to update step' });
    }

    res.json({ ok: true, step: updatedStep });

  } catch (error) {
    console.error('[SEQUENCES] Error updating step:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Delete sequence step
app.delete('/api/sequences/:id/steps/:stepId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const sequenceId = req.params.id;
    const stepId = req.params.stepId;

    // Verify sequence belongs to user
    const { data: sequence, error: sequenceError } = await supabase
      .from('sequences')
      .select('id')
      .eq('id', sequenceId)
      .eq('business_id', profile.business_id)
      .single();

    if (sequenceError || !sequence) {
      return res.status(404).json({ ok: false, error: 'Sequence not found' });
    }

    // Delete step
    const { error: deleteError } = await supabase
      .from('sequence_steps')
      .delete()
      .eq('id', stepId)
      .eq('sequence_id', sequenceId);

    if (deleteError) {
      console.error('[SEQUENCES] Error deleting step:', deleteError);
      return res.status(500).json({ ok: false, error: 'Failed to delete step' });
    }

    res.json({ ok: true, message: 'Step deleted successfully' });

  } catch (error) {
    console.error('[SEQUENCES] Error deleting step:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Reorder sequence steps
app.post('/api/sequences/:id/steps/reorder', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const sequenceId = req.params.id;
    const { steps } = req.body; // Array of { id, step_index }

    // Verify sequence belongs to user
    const { data: sequence, error: sequenceError } = await supabase
      .from('sequences')
      .select('id')
      .eq('id', sequenceId)
      .eq('business_id', profile.business_id)
      .single();

    if (sequenceError || !sequence) {
      return res.status(404).json({ ok: false, error: 'Sequence not found' });
    }

    // Update step indices
    const updates = steps.map(step => 
      supabase
        .from('sequence_steps')
        .update({ step_index: step.step_index })
        .eq('id', step.id)
        .eq('sequence_id', sequenceId)
    );

    await Promise.all(updates);

    res.json({ ok: true, message: 'Steps reordered successfully' });

  } catch (error) {
    console.error('[SEQUENCES] Error reordering steps:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Get message templates
app.get('/api/message-templates', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const { data: templates, error: templatesError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('business_id', profile.business_id)
      .order('created_at', { ascending: false });

    if (templatesError) {
      console.error('[TEMPLATES] Error fetching templates:', templatesError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch templates' });
    }

    res.json({ ok: true, templates });

  } catch (error) {
    console.error('[TEMPLATES] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});
// Test send message
app.post('/api/sequences/:id/test-send', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const sequenceId = req.params.id;
    const { email, phone, template_id, step_index } = req.body;

    // Validate required fields
    if (!email && !phone) {
      return res.status(400).json({ ok: false, error: 'Email or phone is required' });
    }

    if (!template_id) {
      return res.status(400).json({ ok: false, error: 'Template ID is required' });
    }

    // Verify sequence belongs to user
    const { data: sequence, error: sequenceError } = await supabase
      .from('sequences')
      .select('id')
      .eq('id', sequenceId)
      .eq('business_id', profile.business_id)
      .single();

    if (sequenceError || !sequence) {
      return res.status(404).json({ ok: false, error: 'Sequence not found' });
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', template_id)
      .eq('business_id', profile.business_id)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ ok: false, error: 'Template not found' });
    }

    // Create test message record
    const messageData = {
      business_id: profile.business_id,
      sequence_id: sequenceId,
      customer_email: email,
      customer_phone: phone,
      template_id: template_id,
      step_index: step_index || 0,
      status: 'test_sent',
      channel: template.channel,
      subject: template.subject,
      content: template.content,
      created_at: new Date().toISOString()
    };

    const { data: testMessage, error: messageError } = await supabase
      .from('messages')
      .insert(messageData)
      .select('*')
      .single();

    if (messageError) {
      console.error('[TEST_SEND] Error creating test message:', messageError);
      return res.status(500).json({ ok: false, error: 'Failed to create test message' });
    }

    // In a real implementation, you would actually send the message here
    // For now, we'll just log it
    console.log(`[TEST_SEND] Test message sent to ${email || phone}:`, {
      template: template.name,
      channel: template.channel,
      content: template.content
    });

    res.json({ 
      ok: true, 
      message: 'Test message sent successfully',
      test_message: testMessage
    });

  } catch (error) {
    console.error('[TEST_SEND] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Triggers endpoint
app.get('/api/triggers', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    // Get trigger statistics from automation_logs
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get event counts by type for the last 7 days
    const { data: eventCounts, error: countError } = await supabase
      .from('automation_logs')
      .select('level, created_at')
      .eq('business_id', profile.business_id)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (countError) {
      console.error('[TRIGGERS] Error fetching event counts:', countError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch trigger data' });
    }

    // Process event counts
    const eventStats = {};
    eventCounts.forEach(log => {
      const eventType = log.event_type;
      if (!eventStats[eventType]) {
        eventStats[eventType] = {
          count: 0,
          lastFired: null
        };
      }
      eventStats[eventType].count++;
      if (!eventStats[eventType].lastFired || new Date(log.created_at) > new Date(eventStats[eventType].lastFired)) {
        eventStats[eventType].lastFired = log.created_at;
      }
    });

    // Build triggers array
    const triggers = [
      {
        id: 'zapier-job-completed',
        name: 'Zapier: Job Completed',
        type: 'zapier',
        status: 'active',
        lastFired: eventStats.job_completed?.lastFired || null,
        volume7d: eventStats.job_completed?.count || 0,
        webhookUrl: null,
        zapierUrl: 'https://zapier.com/apps/blipp/integrations'
      },
      {
        id: 'zapier-invoice-paid',
        name: 'Zapier: Invoice Paid',
        type: 'zapier',
        status: 'active',
        lastFired: eventStats.invoice_paid?.lastFired || null,
        volume7d: eventStats.invoice_paid?.count || 0,
        webhookUrl: null,
        zapierUrl: 'https://zapier.com/apps/blipp/integrations'
      },
      {
        id: 'webhook-general',
        name: 'Webhook',
        type: 'webhook',
        status: 'active',
        lastFired: eventStats.webhook_test?.lastFired || null,
        volume7d: eventStats.webhook_test?.count || 0,
        webhookUrl: 'https://myblipp.com/api/webhooks/trigger',
        zapierUrl: null
      },
      {
        id: 'csv-import',
        name: 'CSV Import',
        type: 'csv',
        status: 'active',
        lastFired: eventStats.csv_import?.lastFired || null,
        volume7d: eventStats.csv_import?.count || 0,
        webhookUrl: null,
        zapierUrl: null
      }
    ];

    res.json({ ok: true, triggers });
  } catch (error) {
    console.error('[TRIGGERS] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Message Templates endpoints
app.get('/api/message-templates', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const { data: templates, error: templatesError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('business_id', profile.business_id)
      .order('created_at', { ascending: false });

    if (templatesError) {
      console.error('[TEMPLATES] Error fetching templates:', templatesError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch templates' });
    }

    res.json({ ok: true, templates });
  } catch (error) {
    console.error('[TEMPLATES] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

app.post('/api/message-templates', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const { name, channel, subject, content } = req.body;

    if (!name || !channel || !content) {
      return res.status(400).json({ ok: false, error: 'Name, channel, and content are required' });
    }

    const templateData = {
      business_id: profile.business_id,
      name,
      channel,
      subject: subject || null,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newTemplate, error: createError } = await supabase
      .from('message_templates')
      .insert(templateData)
      .select('*')
      .single();

    if (createError) {
      console.error('[TEMPLATES] Error creating template:', createError);
      return res.status(500).json({ ok: false, error: 'Failed to create template' });
    }

    res.json({ ok: true, template: newTemplate });
  } catch (error) {
    console.error('[TEMPLATES] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

app.patch('/api/message-templates/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const templateId = req.params.id;
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    const { data: updatedTemplate, error: updateError } = await supabase
      .from('message_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('business_id', profile.business_id)
      .select('*')
      .single();

    if (updateError) {
      console.error('[TEMPLATES] Error updating template:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to update template' });
    }

    res.json({ ok: true, template: updatedTemplate });
  } catch (error) {
    console.error('[TEMPLATES] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

app.delete('/api/message-templates/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const templateId = req.params.id;

    const { error: deleteError } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', templateId)
      .eq('business_id', profile.business_id);

    if (deleteError) {
      console.error('[TEMPLATES] Error deleting template:', deleteError);
      return res.status(500).json({ ok: false, error: 'Failed to delete template' });
    }

    res.json({ ok: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('[TEMPLATES] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Automation Logs endpoint
app.get('/api/automation-logs', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    // Get logs with related data
    const { data: logs, error: logsError } = await supabase
      .from('automation_logs')
      .select(`
        *,
        sequences:sequence_id (
          id,
          name
        ),
        customers:customer_id (
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq('business_id', profile.business_id)
      .order('created_at', { ascending: false })
      .limit(1000); // Limit to prevent overwhelming response

    if (logsError) {
      console.error('[AUTOMATION_LOGS] Error fetching logs:', logsError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch logs' });
    }

    // Transform the data to include related information
    const transformedLogs = logs.map(log => ({
      id: log.id,
      event_type: log.event_type,
      sequence_id: log.sequence_id,
      customer_id: log.customer_id,
      channel: log.channel,
      status: log.status,
      message: log.message,
      error: log.error,
      payload: log.payload,
      created_at: log.created_at,
      business_id: log.business_id,
      // Include related data
      sequence_name: log.sequences?.name || 'Unknown Sequence',
      customer_name: log.customers ? log.customers.full_name : 'Unknown Customer',
      customer_email: log.customers?.email || null,
      customer_phone: log.customers?.phone || null
    }));

    res.json({ ok: true, logs: transformedLogs });
  } catch (error) {
    console.error('[AUTOMATION_LOGS] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Automation KPIs endpoint
app.get('/api/automation-kpis', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    // Get active sequences count
    const { data: activeSequences, error: sequencesError } = await supabase
      .from('sequences')
      .select('id')
      .eq('business_id', profile.business_id)
      .eq('status', 'active');

    if (sequencesError) {
      console.error('[AUTOMATION_KPIS] Error fetching active sequences:', sequencesError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch active sequences' });
    }

    // Get customers currently in sequences (active enrollments)
    const { data: activeEnrollments, error: enrollmentsError } = await supabase
      .from('sequence_enrollments')
      .select('customer_id')
      .eq('business_id', profile.business_id)
      .eq('status', 'active');

    if (enrollmentsError) {
      console.error('[AUTOMATION_KPIS] Error fetching active enrollments:', enrollmentsError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch active enrollments' });
    }

    // Get 7-day conversion rate (reviews / requests)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Count review requests sent in last 7 days
    const { data: reviewRequests, error: requestsError } = await supabase
      .from('automation_logs')
      .select('id')
      .eq('business_id', profile.business_id)
      .eq('level', 'info')
      .like('message', '%message sent%')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (requestsError) {
      console.error('[AUTOMATION_KPIS] Error fetching review requests:', requestsError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch review requests' });
    }

    // Note: review_left column doesn't exist, skipping this metric

    // Calculate conversion rate (simplified without review_left column)
    const conversionRate = 0; // Placeholder since review_left column doesn't exist

    const kpis = {
      activeSequences: activeSequences.length,
      customersInSequences: activeEnrollments.length,
      conversionRate7d: conversionRate
    };

    res.json({ ok: true, kpis });
  } catch (error) {
    console.error('[AUTOMATION_KPIS] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Metrics and alerts endpoint
app.get('/api/automation-metrics', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const businessId = profile.business_id;
    const sends = incrementMetric(businessId, 'sends');
    const failures = incrementMetric(businessId, 'failures');
    const failureRate = sends > 0 ? (failures / sends) * 100 : 0;
    const threshold = parseFloat(process.env.FAILURE_THRESHOLD || '10');
    const hasAlert = failureRate > threshold;

    const metrics = {
      sends,
      failures,
      failureRate: Math.round(failureRate * 100) / 100,
      threshold,
      hasAlert,
      alertMessage: hasAlert ? `High failure rate detected: ${failureRate.toFixed(2)}% (threshold: ${threshold}%)` : null
    };

    res.json({ ok: true, metrics });
  } catch (error) {
    console.error('[AUTOMATION_METRICS] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Get safety rules summary
app.get('/api/safety-rules', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const safetyRules = await getSafetyRulesSummary(profile.business_id);

    res.json({
      ok: true,
      safetyRules
    });
  } catch (error) {
    console.error('[SAFETY_RULES] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Get or generate Zapier token for business
app.get('/api/zapier/token/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get business and check if token exists
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, zapier_token')
      .eq('id', businessId)
      .single();

    if (businessError) {
      console.error('[ZAPIER_TOKEN] Business not found:', businessError);
      return res.status(404).json({ error: 'Business not found' });
    }

    // If no token exists, generate one
    if (!business.zapier_token) {
      const newToken = 'blipp_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ zapier_token: newToken })
        .eq('id', businessId);

      if (updateError) {
        console.error('[ZAPIER_TOKEN] Error updating token:', updateError);
        return res.status(500).json({ error: 'Failed to generate token' });
      }

      return res.json({
        ok: true,
        business_id: businessId,
        business_name: business.name,
        zapier_token: newToken,
        message: 'New token generated successfully'
      });
    }

    return res.json({
      ok: true,
      business_id: businessId,
      business_name: business.name,
      zapier_token: business.zapier_token,
      message: 'Existing token retrieved'
    });

  } catch (error) {
    console.error('[ZAPIER_TOKEN] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test Zapier connection endpoint
app.get('/api/zapier/test', async (req, res) => {
  try {
    const zapierToken = req.headers['x-zapier-token'] || req.query.zapier_token;
    console.log('[ZAPIER_TEST] Received token:', zapierToken);
    console.log('[ZAPIER_TEST] Expected token:', process.env.ZAPIER_TOKEN);
    console.log('[ZAPIER_TEST] Tokens match:', zapierToken === process.env.ZAPIER_TOKEN);
    
    return res.status(200).json({ 
      ok: true, 
      message: 'Zapier test endpoint working',
      receivedToken: zapierToken,
      expectedToken: process.env.ZAPIER_TOKEN,
      tokensMatch: zapierToken === process.env.ZAPIER_TOKEN
    });
  } catch (error) {
    console.error('[ZAPIER_TEST] Error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Generate Zapier token endpoint
app.post('/api/zapier/generate-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Generate a new Zapier token
    const zapierToken = `blipp_zap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store the token in the database (you might want to add a tokens table)
    // For now, just return it
    res.json({ 
      ok: true, 
      token: zapierToken,
      message: 'Zapier token generated successfully'
    });
  } catch (error) {
    console.error('[ZAPIER_TOKEN] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});
// Auto-enrollment helper function
async function handleAutoEnrollment(businessId, customers, autoEnrollParams, userId) {
  const { sequenceId, backfillWindow, requireServiceDate } = autoEnrollParams;
  
  // Get the sequence details
  const { data: sequence, error: sequenceError } = await supabase
    .from('sequences')
    .select('*')
    .eq('id', sequenceId)
    .eq('business_id', businessId)
    .single();

  if (sequenceError || !sequence) {
    throw new Error('Sequence not found or not accessible');
  }

  // Calculate the backfill cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - backfillWindow);

  const enrollmentSummary = {
    enrolled: 0,
    skipped: 0,
    skippedReasons: {},
    nextRuns: []
  };

  // Process each customer for enrollment
  for (const customer of customers) {
    try {
      // Check if customer meets enrollment criteria
      const enrollmentCheck = await checkEnrollmentEligibility(
        businessId,
        customer,
        sequenceId,
        cutoffDate,
        requireServiceDate
      );

      if (!enrollmentCheck.eligible) {
        enrollmentSummary.skipped++;
        const reason = enrollmentCheck.reason;
        enrollmentSummary.skippedReasons[reason] = (enrollmentSummary.skippedReasons[reason] || 0) + 1;
        continue;
      }

      // Create enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('sequence_enrollments')
        .insert({
          business_id: businessId,
          sequence_id: sequenceId,
          customer_id: customer.id,
          status: 'active',
          enrolled_at: new Date().toISOString(),
          next_run_at: calculateNextRunTime(sequence),
          created_by: userId
        })
        .select()
        .single();

      if (enrollmentError) {
        console.error(`[AUTO_ENROLL] Error creating enrollment for customer ${customer.id}:`, enrollmentError);
        enrollmentSummary.skipped++;
        enrollmentSummary.skippedReasons['Enrollment creation failed'] = (enrollmentSummary.skippedReasons['Enrollment creation failed'] || 0) + 1;
        continue;
      }

      enrollmentSummary.enrolled++;
      
      // Add to next runs preview (limit to first 10)
      if (enrollmentSummary.nextRuns.length < 10) {
        enrollmentSummary.nextRuns.push({
          customer_name: customer.full_name || customer.email,
          next_run_at: enrollment.next_run_at
        });
      }

      // Log the enrollment
      await logAutomationEvent(
        businessId,
        'info',
        'enrollment',
        'Customer auto-enrolled from CSV import',
        {
          customer_id: customer.id,
          sequence_id: sequenceId,
          enrollment_id: enrollment.id
        }
      );

    } catch (error) {
      console.error(`[AUTO_ENROLL] Error processing customer ${customer.id}:`, error);
      enrollmentSummary.skipped++;
      enrollmentSummary.skippedReasons['Processing error'] = (enrollmentSummary.skippedReasons['Processing error'] || 0) + 1;
    }
  }

  return enrollmentSummary;
}

// Check if a customer is eligible for enrollment
async function checkEnrollmentEligibility(businessId, customer, sequenceId, cutoffDate, requireServiceDate) {
  // Check if customer has valid email
  if (!customer.email || !/^\S+@\S+\.\S+$/.test(customer.email)) {
    return { eligible: false, reason: 'Invalid or missing email' };
  }

  // Check service date requirement
  if (requireServiceDate && (!customer.service_date || new Date(customer.service_date) < cutoffDate)) {
    return { eligible: false, reason: 'Service date not within backfill window' };
  }

  // Check if customer is already enrolled in this sequence
  const { data: existingEnrollment } = await supabase
    .from('sequence_enrollments')
    .select('id')
    .eq('business_id', businessId)
    .eq('sequence_id', sequenceId)
    .eq('customer_id', customer.id)
    .single();

  if (existingEnrollment) {
    return { eligible: false, reason: 'Already enrolled in this sequence' };
  }

  // Check if customer is unsubscribed or DNC
  const { data: customerData } = await supabase
    .from('customers')
    .select('unsubscribed, dnc, hard_bounced, last_review_request_at')
    .eq('id', customer.id)
    .single();

  if (customerData) {
    if (customerData.unsubscribed) {
      return { eligible: false, reason: 'Customer unsubscribed' };
    }
    if (customerData.dnc) {
      return { eligible: false, reason: 'Customer on DNC list' };
    }
    if (customerData.hard_bounced) {
      return { eligible: false, reason: 'Customer email hard bounced' };
    }
    
    // Check cooldown period (if last review request was within cooldown days)
    const cooldownDays = parseInt(process.env.COOLDOWN_DAYS) || 7;
    if (customerData.last_review_request_at) {
      const lastRequestDate = new Date(customerData.last_review_request_at);
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() - cooldownDays);
      
      if (lastRequestDate > cooldownDate) {
        return { eligible: false, reason: 'Within cooldown period' };
      }
    }
  }

  return { eligible: true };
}

// Duplicate function removed - already defined above

// CSV Auto-mapping endpoint
app.post('/api/csv/auto-map', async (req, res) => {
  try {
    const { headers, sampleRows } = req.body;
    
    if (!headers || !Array.isArray(headers)) {
      return res.status(400).json({ error: 'Headers array is required' });
    }

    console.log('[CSV_AUTO_MAP] Processing headers:', headers);
    console.log('[CSV_AUTO_MAP] Sample rows:', sampleRows?.length || 0);

    // AI-powered column mapping
    let mapping = {};
    let usedAI = false;

    try {
      if (process.env.OPENAI_API_KEY && sampleRows && sampleRows.length > 0) {
        // Create prompt for AI mapping
        const prompt = `Analyze these CSV headers and sample data to map them to customer fields:

Headers: ${headers.join(', ')}
Sample data: ${JSON.stringify(sampleRows.slice(0, 3))}

Map these headers to customer fields:
- full_name: Customer's full name
- email: Email address
- phone: Phone number
- service_date: Service/appointment date
- tags: Tags or categories
- notes: Notes or comments
- status: Customer status

Respond with JSON only:
{
  "mapping": {
    "full_name": "header_name_or_null",
    "email": "header_name_or_null", 
    "phone": "header_name_or_null",
    "service_date": "header_name_or_null",
    "tags": "header_name_or_null",
    "notes": "header_name_or_null",
    "status": "header_name_or_null"
  },
  "confidence": 0.85,
  "reasoning": "Brief explanation of mapping decisions"
}`;

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are an expert at analyzing CSV data and mapping columns to database fields. Always respond with valid JSON only.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 300,
            temperature: 0.3,
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (openaiResponse.ok) {
          const aiData = await openaiResponse.json();
          const aiResponse = JSON.parse(aiData.choices[0]?.message?.content || '{}');
          
          if (aiResponse.mapping) {
            mapping = aiResponse.mapping;
            usedAI = true;
            console.log('[CSV_AUTO_MAP] AI mapping successful:', mapping);
          }
        }
      }
    } catch (aiError) {
      console.log('[CSV_AUTO_MAP] AI mapping failed, using heuristic mapping:', aiError.message);
    }

    // Fallback to heuristic mapping if AI failed or wasn't available
    if (!usedAI) {
      mapping = getHeuristicMapping(headers);
      console.log('[CSV_AUTO_MAP] Using heuristic mapping:', mapping);
    }

    // Validate and clean mapping
    const cleanedMapping = {};
    Object.entries(mapping).forEach(([field, header]) => {
      if (header && headers.includes(header)) {
        cleanedMapping[field] = header;
      }
    });

    console.log('[CSV_AUTO_MAP] Final mapping:', cleanedMapping);

    res.status(200).json({
      success: true,
      mapping: cleanedMapping,
      usedAI: usedAI,
      confidence: usedAI ? 0.85 : 0.7,
      availableFields: ['full_name', 'email', 'phone', 'service_date', 'tags', 'notes', 'status']
    });

  } catch (error) {
    console.error('[CSV_AUTO_MAP] Error:', error);
    
    // Fallback to basic heuristic mapping
    const fallbackMapping = getHeuristicMapping(req.body.headers || []);
    
    res.status(200).json({
      success: true,
      mapping: fallbackMapping,
      usedAI: false,
      confidence: 0.6,
      error: 'Using fallback mapping due to processing error',
      availableFields: ['full_name', 'email', 'phone', 'service_date', 'tags', 'notes', 'status']
    });
  }
});

// Heuristic mapping function
function getHeuristicMapping(headers) {
  const mapping = {};
  
  // Common patterns for each field
  const patterns = {
    full_name: ['name', 'full_name', 'fullname', 'customer_name', 'client_name', 'contact_name'],
    email: ['email', 'email_address', 'e_mail', 'mail'],
    phone: ['phone', 'phone_number', 'mobile', 'cell', 'telephone', 'contact_number'],
    service_date: ['service_date', 'appointment_date', 'date', 'service_done', 'completed_date', 'job_date'],
    tags: ['tags', 'category', 'type', 'segment', 'classification'],
    notes: ['notes', 'comments', 'description', 'remarks', 'details'],
    status: ['status', 'state', 'active', 'customer_status']
  };

  headers.forEach(header => {
    const lowerHeader = header.toLowerCase().replace(/[_\s-]/g, '');
    
    Object.entries(patterns).forEach(([field, patterns]) => {
      if (!mapping[field] && patterns.some(pattern => 
        lowerHeader.includes(pattern) || pattern.includes(lowerHeader)
      )) {
        mapping[field] = header;
      }
    });
  });

  return mapping;
}

// CSV Import endpoint
app.post('/api/csv/import', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const { customers, filename, autoEnroll } = req.body;
    
    if (!customers || !Array.isArray(customers)) {
      return res.status(400).json({ ok: false, error: 'Customers array is required' });
    }

    console.log(`[CSV_IMPORT] Importing ${customers.length} customers for business ${profile.business_id}`);

    // Process customers
    const customerData = customers.map(customer => ({
      business_id: profile.business_id,
      full_name: customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
      email: customer.email,
      phone: customer.phone,
      service_date: customer.service_date,
      tags: customer.tags || [],
      status: 'active',
      created_by: user.id
    }));

    // Insert customers
    const { data: insertedCustomers, error: insertError } = await supabase
      .from('customers')
      .insert(customerData)
      .select('id');

    if (insertError) {
      console.error('[CSV_IMPORT] Error inserting customers:', insertError);
      return res.status(500).json({ ok: false, error: 'Failed to import customers' });
    }

    // Log to audit_log
    try {
      await supabase
        .from('audit_log')
        .insert({
          business_id: profile.business_id,
          user_id: user.id,
          entity: 'customers',
          entity_id: null,
          action: 'csv_import',
          payload_hash: crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex'),
          details: {
            source: 'csv_import',
            filename: filename,
            customers_imported: insertedCustomers.length
          }
        });
    } catch (auditError) {
      console.error('[CSV_IMPORT] Audit log error:', auditError);
    }

    // Initialize defaults for this business if not already done
    try {
      await initializeDefaultsForBusiness(profile.business_id);
    } catch (defaultsError) {
      console.error('[CSV_IMPORT] Defaults initialization error:', defaultsError);
      // Don't fail the request if defaults initialization fails
    }

    console.log(`[CSV_IMPORT] ✅ Successfully imported ${insertedCustomers.length} customers`);

    // Handle auto-enrollment if enabled
    let enrollmentSummary = null;
    if (autoEnroll && autoEnroll.enabled && autoEnroll.sequenceId) {
      try {
        console.log(`[CSV_IMPORT] Starting auto-enrollment for sequence ${autoEnroll.sequenceId}`);
        enrollmentSummary = await handleAutoEnrollment(
          profile.business_id,
          insertedCustomers,
          autoEnroll,
          user.id
        );
        console.log(`[CSV_IMPORT] Auto-enrollment completed: ${enrollmentSummary.enrolled} enrolled, ${enrollmentSummary.skipped} skipped`);
      } catch (enrollmentError) {
        console.error('[CSV_IMPORT] Auto-enrollment error:', enrollmentError);
        // Don't fail the import if enrollment fails
      }
    }

    return res.status(200).json({ 
      ok: true, 
      customers_imported: insertedCustomers.length,
      business_id: profile.business_id,
      enrollmentSummary: enrollmentSummary
    });
  } catch (error) {
    console.error('[CSV_IMPORT] Error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

app.get('/api/sequences/:id/analytics', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const sequenceId = req.params.id;

    // Get sequence details
    const { data: sequence, error: sequenceError } = await supabase
      .from('sequences')
      .select('*')
      .eq('id', sequenceId)
      .eq('business_id', profile.business_id)
      .single();

    if (sequenceError || !sequence) {
      return res.status(404).json({ ok: false, error: 'Sequence not found' });
    }

    // Get sequence steps
    const { data: steps, error: stepsError } = await supabase
      .from('sequence_steps')
      .select('*')
      .eq('sequence_id', sequenceId)
      .order('step_index');

    if (stepsError) {
      console.error('[ANALYTICS] Error fetching steps:', stepsError);
    }

    // Get enrollment totals
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('sequence_enrollments')
      .select('status, created_at')
      .eq('sequence_id', sequenceId);

    if (enrollmentsError) {
      console.error('[ANALYTICS] Error fetching enrollments:', enrollmentsError);
    }

    // Calculate enrollment totals
    const enrollmentTotals = {
      total: enrollments?.length || 0,
      active: enrollments?.filter(e => e.status === 'active').length || 0,
      completed: enrollments?.filter(e => e.status === 'finished').length || 0,
      stopped: enrollments?.filter(e => e.status === 'stopped').length || 0
    };

    // Get messages sent for this sequence (from automation_logs)
    const { data: messageLogs, error: logsError } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('sequence_id', sequenceId)
      .eq('level', 'info')
      .like('message', '%sent%')
      .order('created_at', { ascending: false });

    if (logsError) {
      console.error('[ANALYTICS] Error fetching message logs:', logsError);
    }

    // Calculate message totals
    const messageTotals = {
      total: messageLogs?.length || 0,
      last_7_days: messageLogs?.filter(log => {
        const logDate = new Date(log.created_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return logDate >= sevenDaysAgo;
      }).length || 0,
      last_30_days: messageLogs?.filter(log => {
        const logDate = new Date(log.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return logDate >= thirtyDaysAgo;
      }).length || 0
    };

    // Get step-level analytics
    const stepAnalytics = steps?.map(step => {
      const stepLogs = messageLogs?.filter(log => 
        log.data?.step_index === step.step_index
      ) || [];
      
      return {
        step_index: step.step_index,
        kind: step.kind,
        wait_ms: step.wait_ms,
        messages_sent: stepLogs.length,
        last_sent: stepLogs.length > 0 ? stepLogs[0].created_at : null
      };
    }) || [];

    // Calculate conversion rate
    const conversionRate = enrollmentTotals.total > 0 
      ? Math.round((enrollmentTotals.completed / enrollmentTotals.total) * 100 * 100) / 100
      : 0;

    // Get last activity
    const lastActivity = messageLogs?.length > 0 ? messageLogs[0].created_at : null;

    // Calculate quiet hours summary
    const quietHoursSummary = {
      enabled: sequence.quiet_hours_start && sequence.quiet_hours_end,
      start: sequence.quiet_hours_start,
      end: sequence.quiet_hours_end,
      timezone: 'UTC' // TODO: Get from business settings
    };

    // Rate limits summary
    const rateLimitsSummary = {
      per_hour: sequence.rate_per_hour || 'Unlimited',
      per_day: sequence.rate_per_day || 'Unlimited'
    };

    const analytics = {
      sequence: {
        id: sequence.id,
        name: sequence.name,
        status: sequence.status,
        trigger_event_type: sequence.trigger_event_type,
        allow_manual_enroll: sequence.allow_manual_enroll,
        created_at: sequence.created_at,
        updated_at: sequence.updated_at
      },
      enrollment_totals: enrollmentTotals,
      message_totals: messageTotals,
      step_analytics: stepAnalytics,
      conversion_rate: conversionRate,
      last_activity: lastActivity,
      quiet_hours: quietHoursSummary,
      rate_limits: rateLimitsSummary,
      steps: steps || []
    };

    res.json({ ok: true, analytics });

  } catch (error) {
    console.error('[ANALYTICS] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Get customers for a business
app.get('/api/customers', async (req, res) => {
  try {
    const { business_id } = req.query;
    
    if (!business_id) {
      return res.status(400).json({ success: false, error: 'business_id is required' });
    }

    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CUSTOMERS] Error fetching customers:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch customers' });
    }

    res.json({ success: true, data: customers || [] });
  } catch (error) {
    console.error('[CUSTOMERS] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get business integrations
// API endpoint to manage Zapier integrations
app.get('/api/zapier-integrations/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Zapier integrations for this business
    const { data: integrations, error } = await supabase
      .from('business_zapier_integrations')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching Zapier integrations:', error);
      return res.status(500).json({ error: 'Failed to fetch integrations' });
    }

    return res.status(200).json({
      success: true,
      integrations: integrations || []
    });

  } catch (error) {
    console.error('Error in Zapier integrations API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/zapier-integrations/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { zapier_account_email, zap_config, webhook_url, webhook_secret } = req.body;

    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    if (!zapier_account_email || !zap_config) {
      return res.status(400).json({ error: 'Zapier account email and config are required' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create new Zapier integration
    const { data: integration, error } = await supabase
      .from('business_zapier_integrations')
      .insert({
        business_id: businessId,
        zapier_account_email,
        zap_config,
        webhook_url,
        webhook_secret,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating Zapier integration:', error);
      return res.status(500).json({ error: 'Failed to create integration' });
    }

    return res.status(201).json({
      success: true,
      integration
    });

  } catch (error) {
    console.error('Error in Zapier integrations API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/zapier-integrations/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { integration_id, status, error_message, last_sync_at } = req.body;

    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    if (!integration_id || !status) {
      return res.status(400).json({ error: 'Integration ID and status are required' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const updateData = { status };
    if (error_message) updateData.error_message = error_message;
    if (last_sync_at) updateData.last_sync_at = last_sync_at;

    const { data: integration, error } = await supabase
      .from('business_zapier_integrations')
      .update(updateData)
      .eq('id', integration_id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) {
      console.error('Error updating Zapier integration:', error);
      return res.status(500).json({ error: 'Failed to update integration' });
    }

    return res.status(200).json({
      success: true,
      integration
    });

  } catch (error) {
    console.error('Error in Zapier integrations API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/business-integrations', async (req, res) => {
  try {
    const { business_id } = req.query;
    
    if (!business_id) {
      return res.status(400).json({ success: false, error: 'business_id is required' });
    }

    const { data: integrations, error } = await supabase
      .from('business_integrations')
      .select('*')
      .eq('business_id', business_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[INTEGRATIONS] Error fetching integrations:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch integrations' });
    }

    res.json({ success: true, data: integrations || [] });
  } catch (error) {
    console.error('[INTEGRATIONS] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Cron endpoint for automation execution
app.post('/api/_cron/automation-executor', async (req, res) => {
  try {
    console.log('Starting automation execution...');
    
    // Execute scheduled automations
    const { data: processedCount, error: executeError } = await supabase
      .rpc('execute_scheduled_automations');

    if (executeError) {
      console.error('Error executing automations:', executeError);
      return res.status(500).json({ error: 'Failed to execute automations' });
    }

    console.log(`Processed ${processedCount} automation executions`);

    // Get pending scheduled automation emails
    console.log('🔍 DEBUG: Fetching automation_email jobs...');
    const currentTime = new Date().toISOString();
    console.log('🔍 DEBUG: Current time:', currentTime);
    
    const { data: scheduledJobs, error: jobsError } = await supabase
      .from('scheduled_jobs')
      .select(`
        id,
        job_type,
        payload,
        run_at
      `)
      .eq('job_type', 'automation_email')
      .eq('status', 'queued')
      .lte('run_at', currentTime)
      .limit(20);

    console.log('🔍 DEBUG: Query result - error:', jobsError);
    console.log('🔍 DEBUG: Query result - jobs found:', scheduledJobs ? scheduledJobs.length : 0);
    if (scheduledJobs && scheduledJobs.length > 0) {
      console.log('🔍 DEBUG: First job details:', scheduledJobs[0]);
    }

    if (jobsError) {
      console.error('Error fetching scheduled automation emails:', jobsError);
    } else if (scheduledJobs && scheduledJobs.length > 0) {
      console.log(`Processing ${scheduledJobs.length} scheduled automation emails`);
      
      for (const job of scheduledJobs) {
        try {
          const reviewRequestId = job.payload.review_request_id;
          
          if (!reviewRequestId) {
            console.error(`No review_request_id in job ${job.id}`);
            await supabase
              .from('scheduled_jobs')
              .update({ status: 'failed' })
              .eq('id', job.id);
            continue;
          }

          // Get the review request data
          const { data: reviewRequest, error: requestError } = await supabase
            .from('review_requests')
            .select(`
              id,
              business_id,
              channel,
              message,
              review_link,
              customers!inner(full_name, email, phone),
              businesses!inner(name, email)
            `)
            .eq('id', reviewRequestId)
            .single();

          if (requestError) {
            console.error(`Error fetching review request ${reviewRequestId}:`, requestError);
            await supabase
              .from('scheduled_jobs')
              .update({ status: 'failed' })
              .eq('id', job.id);
            continue;
          }

          // Fix review link if it's in the old format
          let reviewLink = reviewRequest.review_link;
          if (!reviewLink || reviewLink.includes('/r/') || reviewLink === 'pending') {
            // Generate the correct feedback collection link
            reviewLink = `${process.env.APP_BASE_URL || 'https://myblipp.com'}/feedback/${reviewRequest.id}`;
            await supabase.from('review_requests').update({ review_link: reviewLink }).eq('id', reviewRequest.id);
          }

          // Resolve business name/website (prefer businesses table, fallback to review_sources)
          let companyName = reviewRequest?.businesses?.name || 'Our Business';
          let companyWebsite = null;
          try {
            const { data: biz } = await supabase
              .from('businesses')
              .select('id, name, website')
              .eq('id', reviewRequest.business_id)
              .maybeSingle();
            if (biz) {
              companyName = biz.name || companyName;
              companyWebsite = biz.website || null;
            }
            if (!companyWebsite) {
              const { data: source } = await supabase
                .from('review_sources')
                .select('public_url, business_name')
                .eq('business_id', reviewRequest.business_id)
                .eq('platform', 'google')
                .maybeSingle();
              companyWebsite = source?.public_url || companyWebsite;
              companyName = biz?.name || source?.business_name || companyName;
            }
          } catch (_) {}

          // Get form settings for this business
          let formSettings = {};
          try {
            const { data: settings } = await supabase
              .from('feedback_form_settings')
              .select('settings')
              .eq('business_id', reviewRequest.business_id)
              .maybeSingle();
            if (settings?.settings) {
              formSettings = settings.settings;
            }
          } catch (_) {}

          if (reviewRequest && reviewRequest.customers && reviewRequest.customers.email) {
            console.log(`📧 Sending automation email for job ${job.id} to ${reviewRequest.customers.email}`);
            
            // Check if RESEND_API_KEY is available
            if (!process.env.RESEND_API_KEY) {
              console.error('❌ RESEND_API_KEY not available');
              await supabase
                .from('scheduled_jobs')
                .update({ status: 'failed' })
                .eq('id', job.id);
              continue;
            }

            console.log('✅ RESEND_API_KEY available, length:', process.env.RESEND_API_KEY.length);

            // Process the message to replace variables
            let processedMessage = reviewRequest.message || 'Thank you for your business! Please consider leaving us a review.';
            
            const customerName = reviewRequest.customers.full_name || 'Customer';

            // Replace common variables (add company_* and granular customer names)
            processedMessage = processedMessage
              .replace(/\{\{review_link\}\}/g, reviewLink)
              .replace(/\{\{customer\.name\}\}/g, customerName)
              .replace(/\{\{customer_name\}\}/g, customerName)
              .replace(/\{\{customer\.first_name\}\}/g, customerName.split(' ')[0] || '')
              .replace(/\{\{customer\.last_name\}\}/g, customerName.split(' ').slice(1).join(' ') || '')
              .replace(/\{\{customer\.full_name\}\}/g, customerName)
              .replace(/\{\{business\.name\}\}/g, companyName)
              .replace(/\{\{business_name\}\}/g, companyName)
              .replace(/\{\{company_name\}\}/g, companyName)
              .replace(/\{\{company_website\}\}/g, companyWebsite || '');

            console.log('📝 Original message:', reviewRequest.message);
            console.log('📝 Processed message:', processedMessage);

            // Send email directly via Resend API
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: `${companyName} <noreply@myblipp.com>`,
                to: [reviewRequest.customers.email],
                subject: formSettings.email_subject || `Thanks for choosing ${companyName}!`,
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Review Request</title>
                  </head>
                  <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                      
                      <!-- Header -->
                      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                          ${formSettings.email_header || 'Thank You'}
                        </h1>
                        <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px; font-weight: 300;">
                          ${formSettings.email_subheader || 'We appreciate your business'}
                        </p>
                      </div>
                      
                      <!-- Main Content -->
                      <div style="padding: 40px 30px;">
                        <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                          Hi ${customerName},
                        </h2>
                        
                        <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                          <p style="color: #334155; margin: 0; font-size: 16px; line-height: 1.6;">
                            ${formSettings.email_message || processedMessage}
                          </p>
                        </div>
                        
                        <p style="color: #64748b; margin: 25px 0; font-size: 16px; line-height: 1.6;">
                          Your feedback helps us improve our services and assists other customers in making informed decisions.
                        </p>
                        
                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 35px 0;">
                          <a href="${reviewLink}" 
                             style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); transition: all 0.2s ease;">
                            ${formSettings.email_button_text || 'Leave Feedback'}
                          </a>
                        </div>
                        
                        <div style="border-top: 1px solid #e2e8f0; margin: 35px 0 25px 0;"></div>
                        
                        <p style="color: #64748b; margin: 0; font-size: 14px; text-align: center;">
                          Thank you for choosing <strong style="color: #1e293b;">${companyName}</strong>${companyWebsite ? ` • <a href="${companyWebsite}" style="color: #3b82f6; text-decoration: none;">Website</a>` : ''}
                        </p>
                      </div>
                      
                      <!-- Footer -->
                      <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                          This email was sent by Blipp - Review Automation Platform
                        </p>
                        <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">
                          If you have any questions, please contact ${companyName} directly.
                        </p>
                      </div>
                      
                    </div>
                  </body>
                  </html>
                `
              })
            });

            console.log('📧 Email response status:', emailResponse.status);
            console.log('📧 Email response headers:', Object.fromEntries(emailResponse.headers.entries()));

            if (emailResponse.ok) {
              const emailData = await emailResponse.json();
              console.log('✅ Email sent successfully:', emailData.id);
              
              // Update review request status
              await supabase
                .from('review_requests')
                .update({ 
                  status: 'sent',
                  sent_at: new Date().toISOString()
                })
                .eq('id', reviewRequestId);

              // Mark job as completed
              await supabase
                .from('scheduled_jobs')
                .update({ 
                  status: 'success',
                  processed_at: new Date().toISOString()
                })
                .eq('id', job.id);
            } else {
              console.error('❌ Failed to send email:', emailResponse.status);
              const errorText = await emailResponse.text();
              console.error('❌ Error response:', errorText);
              
              // Mark job as failed
              await supabase
                .from('scheduled_jobs')
                .update({ status: 'failed' })
                .eq('id', job.id);
            }
          } else {
            console.error(`No customer email for review request ${reviewRequestId}`);
            await supabase
              .from('scheduled_jobs')
              .update({ status: 'failed' })
              .eq('id', job.id);
          }
        } catch (error) {
          console.error(`Error processing automation job ${job.id}:`, error);
          
          // Mark job as failed
          await supabase
            .from('scheduled_jobs')
            .update({ status: 'failed' })
            .eq('id', job.id);
        }
      }
    }

    // Get pending review requests and send them
    const { data: pendingRequests, error: requestsError } = await supabase
      .from('review_requests')
      .select(`
        id, 
        business_id, 
        customer_id,
        channel, 
        message, 
        review_link,
        customers!inner(
          full_name,
          email
        ),
        businesses!inner(
          name,
          email,
          phone,
          google_review_url,
          yelp_review_url
        )
      `)
      .eq('status', 'pending')
      .lte('send_at', new Date().toISOString());

    if (requestsError) {
      console.error('Error fetching pending requests:', requestsError);
      return res.status(500).json({ error: 'Failed to fetch pending requests' });
    }

    console.log(`Found ${pendingRequests.length} pending review requests`);

    // Process each pending request
    for (const request of pendingRequests) {
      try {
        // Update status to processing
        await supabase
          .from('review_requests')
          .update({ status: 'processing' })
          .eq('id', request.id);

        // Send the review request (this would integrate with your email/SMS service)
        console.log(`Sending review request to ${request.customer_email}`);
        
        // Update status to sent
        await supabase
          .from('review_requests')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', request.id);

      } catch (requestError) {
        console.error(`Error processing request ${request.id}:`, requestError);
        
        // Update status to failed
        await supabase
          .from('review_requests')
          .update({ 
            status: 'failed',
            error_message: requestError.message
          })
          .eq('id', request.id);
      }
    }

    res.json({ 
      success: true, 
      processedAutomations: scheduledJobs ? scheduledJobs.length : 0,
      processedRequests: 0
    });

  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Template management endpoints
app.post('/api/templates/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { name, description, channels, trigger_type, config_json } = req.body;

    // Validate required fields
    if (!name || !channels || !trigger_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Verify business belongs to user
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('created_by', user.email)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Create template
    const { data: template, error: createError } = await supabase
      .from('automation_templates')
      .insert({
        business_id: businessId,
        name,
        description: description || '',
        channels,
        trigger_type,
        config_json: config_json || {},
        status: 'paused',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating template:', createError);
      return res.status(500).json({ error: 'Failed to create template' });
    }

    return res.status(201).json({ template });

  } catch (error) {
    console.error('Error in template creation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/templates/:businessId/:templateId', async (req, res) => {
  try {
    const { businessId, templateId } = req.params;
    const updates = req.body;

    // Get user from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Verify business belongs to user
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('created_by', user.email)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Update template
    const { data: template, error: updateError } = await supabase
      .from('automation_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating template:', updateError);
      return res.status(500).json({ error: 'Failed to update template' });
    }

    return res.status(200).json({ template });

  } catch (error) {
    console.error('Error in template update:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Automation trigger endpoint
app.post('/api/automation/trigger', async (req, res) => {
  try {
    console.log('🚀 Automation trigger API called');
    const { customer_id, trigger_type, trigger_data } = req.body;
    console.log('📋 Request data:', { customer_id, trigger_type, trigger_data });

    // Validate required fields
    if (!customer_id || !trigger_type) {
      return res.status(400).json({ 
        error: 'Missing required fields: customer_id, trigger_type' 
      });
    }

    // Validate trigger_type
    const validTriggers = ['job_completed', 'invoice_paid', 'service_completed', 'customer_created', 'manual_trigger'];
    if (!validTriggers.includes(trigger_type)) {
      return res.status(400).json({ 
        error: 'Invalid trigger_type. Must be one of: ' + validTriggers.join(', ') 
      });
    }

    // Get user from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 Auth token received:', token ? 'Present' : 'Missing');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user's business_id using email-based lookup
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('created_by', user.email)
      .single();

    if (businessError || !business) {
      return res.status(400).json({ error: 'User not associated with a business' });
    }

    // Verify customer belongs to business
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name, email, phone')
      .eq('id', customer_id)
      .eq('business_id', business.id)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // For manual triggers, create a review request directly
    if (trigger_type === 'manual_trigger') {
      const { template_id, template_name, template_message, delay_hours, channels } = trigger_data;
      
      // Generate review link
      const reviewLink = `${process.env.APP_BASE_URL || 'https://myblipp.com'}/r/${Math.random().toString(36).substring(2, 10)}`;
      
      // Create review request entry
      const { data: reviewRequest, error: requestError } = await supabase
        .from('review_requests')
        .insert({
          business_id: business.id,
          customer_id: customer_id,
          channel: channels?.[0] || 'email',
          review_link: reviewLink,
          message: template_message || 'Thank you for your business! Please consider leaving us a review.',
          status: 'pending',
          send_at: new Date().toISOString(),
          user_id: user.id
        })
        .select()
        .single();

      if (requestError) {
        console.error('Error creating review request:', requestError);
        return res.status(500).json({ error: 'Failed to create review request' });
      }

      // Schedule the email to be sent after the delay
      const sendTime = new Date();
      if (delay_hours > 0) {
        sendTime.setHours(sendTime.getHours() + delay_hours);
      }
      // If delay_hours is 0, sendTime remains as current time (instant)
      
      const { error: scheduleError } = await supabase
        .from('scheduled_jobs')
        .insert({
          business_id: business.id,
          job_type: 'automation_email',
          payload: {
            review_request_id: reviewRequest.id,
            business_id: business.id,
            template_id: template_id,
            template_name: template_name
          },
          run_at: sendTime.toISOString(),
          status: 'queued'
        });

      if (scheduleError) {
        console.error('Error scheduling automation email:', scheduleError);
        return res.status(500).json({ error: 'Failed to schedule automation email' });
      }

      return res.status(200).json({ 
        success: true, 
        message: `${template_name} automation triggered successfully`,
        review_request_id: reviewRequest.id,
        scheduled_for: sendTime.toISOString(),
        customer_name: customer.full_name
      });
    }

    // For other trigger types, use the existing database function
    const { data: executionId, error: triggerError } = await supabase
      .rpc('trigger_automation', {
        p_business_id: business.id,
        p_customer_id: customer_id,
        p_trigger_type: trigger_type,
        p_trigger_data: trigger_data || {}
      });

    if (triggerError) {
      console.error('Error triggering automation:', triggerError);
      return res.status(500).json({ error: 'Failed to trigger automation' });
    }

    // Log the trigger event
    await supabase.rpc('log_telemetry_event', {
      p_business_id: business.id,
      p_event_type: 'automation_triggered',
      p_event_data: { 
        trigger_type, 
        customer_id, 
        execution_id: executionId,
        trigger_data 
      }
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Automation triggered successfully',
      execution_id: executionId,
      customer_name: customer.full_name
    });

  } catch (error) {
    console.error('Error in automation trigger:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// CRM INTEGRATION ROUTES
// ============================================================================

// Jobber CRM Integration Routes
app.post('/api/crm/jobber/connect', async (req, res) => {
  try {
    console.log('Jobber connect request received:', { body: req.body });
    
    const { business_id } = req.body;
    
    if (!business_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Business ID is required' 
      });
    }

    if (!process.env.JOBBER_CLIENT_ID || !process.env.JOBBER_REDIRECT_URI) {
      console.error('Missing Jobber environment variables:', {
        clientId: !!process.env.JOBBER_CLIENT_ID,
        redirectUri: !!process.env.JOBBER_REDIRECT_URI
      });
      return res.status(500).json({ 
        success: false, 
        error: 'Jobber integration not configured properly' 
      });
    }

    const state = Buffer.from(JSON.stringify({ business_id })).toString('base64');
    const authUrl = `https://api.getjobber.com/api/oauth/authorize?client_id=${process.env.JOBBER_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.JOBBER_REDIRECT_URI)}&response_type=code&scope=read:all&state=${state}`;

    console.log('Generated Jobber auth URL:', authUrl);

    res.json({
      success: true,
      authUrl: authUrl,
      state: state
    });

  } catch (error) {
    console.error('Jobber connection error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to initiate Jobber connection' 
    });
  }
});
app.get('/api/crm/jobber/callback', async (req, res) => {
  try {
    console.log('Jobber callback received:', req.query);
    const { code, state } = req.query;
    
    if (!code) {
      console.error('No authorization code received');
      return res.status(400).json({ error: 'Authorization code missing' });
    }

    if (!state) {
      console.error('No state parameter received');
      return res.status(400).json({ error: 'State parameter missing' });
    }

    // Decode state to get business_id
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { business_id } = stateData;
    console.log('Decoded state data:', stateData);

    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.getjobber.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.JOBBER_CLIENT_ID,
        client_secret: process.env.JOBBER_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.JOBBER_REDIRECT_URI,
      }),
    });

    const tokens = await tokenResponse.json();
    console.log('Token exchange response status:', tokenResponse.status);
    console.log('Token exchange response:', tokens);
    
    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokens);
      return res.status(400).json({ error: 'Failed to exchange authorization code' });
    }

    // Store connection in database
    const expiresIn = tokens.expires_in || 3600; // Default to 1 hour if not provided
    const expiresAt = new Date(Date.now() + (expiresIn * 1000));
    const connectedAt = new Date();
    
    console.log('Storing connection with dates:', {
      expiresAt: expiresAt.toISOString(),
      connectedAt: connectedAt.toISOString(),
      expiresIn: expiresIn,
      tokensReceived: Object.keys(tokens)
    });
    
    const { error: insertError } = await supabase
      .from('crm_connections')
      .upsert({
        business_id,
        crm_type: 'jobber',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        connected_at: connectedAt.toISOString()
      });

    if (insertError) {
      console.error('Database error:', insertError);
      console.error('Insert data:', {
        business_id,
        crm_type: 'jobber',
        access_token: tokens.access_token ? 'present' : 'missing',
        refresh_token: tokens.refresh_token ? 'present' : 'missing',
        token_expires_at: expiresAt.toISOString(),
        connected_at: connectedAt.toISOString()
      });
      return res.status(500).json({ error: 'Failed to store connection: ' + insertError.message });
    }

    // Set up webhook (don't fail if this doesn't work)
    try {
      await setupJobberWebhook(tokens.access_token, business_id);
      console.log('Jobber webhook setup completed');
    } catch (webhookError) {
      console.error('Webhook setup failed, but connection will still work:', webhookError);
    }

    // Redirect back to the app with success message
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://myblipp.com'}/dashboard?jobber_connected=true`;
    console.log('Jobber OAuth completed successfully, redirecting to:', redirectUrl);
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Jobber callback error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Redirect to dashboard with error message instead of JSON
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://myblipp.com'}/dashboard?jobber_error=true&error=${encodeURIComponent(error.message)}`;
    console.log('Jobber OAuth failed, redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  }
});
app.get('/api/crm/jobber/status', async (req, res) => {
  try {
    const { business_id } = req.query;
    
    console.log('Jobber status check for business_id:', business_id);
    
    if (!business_id) {
      return res.status(400).json({ error: 'Business ID required' });
    }

    // Check if crm_connections table exists first
    // First try to find connection for the specific business ID
    let { data: connection, error } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('business_id', business_id)
      .eq('crm_type', 'jobber')
      .single();

    // If no connection found for this business ID, check if there's any Jobber connection
    // (in case business ID changed between sessions)
    if (error && error.code === 'PGRST116') {
      console.log('No connection found for specific business_id, checking for any Jobber connection...');
      const { data: anyConnection, error: anyError } = await supabase
        .from('crm_connections')
        .select('*')
        .eq('crm_type', 'jobber')
        .single();
      
      if (!anyError && anyConnection) {
        console.log('Found existing Jobber connection for different business_id, updating...');
        connection = anyConnection;
        error = null;
        
        // Update the connection to use the correct business_id
        await supabase
          .from('crm_connections')
          .update({ business_id })
          .eq('id', connection.id);
      }
    }

    console.log('Database query result:', { connection, error });

    if (error && error.code !== 'PGRST116') {
      console.error('Database error:', error);
      // If table doesn't exist, return not connected
      if (error.code === '42P01') {
        return res.json({
          connected: false,
          connection: null
        });
      }
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (!connection) {
      return res.json({
        connected: false,
        connection: null
      });
    }

    // Check if token is expired
    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at);
      const now = new Date();
      
      if (now >= expiresAt) {
        console.log('Jobber token expired, marking as disconnected');
        // Delete expired connection
        await supabase
          .from('crm_connections')
          .delete()
          .eq('id', connection.id);
        
        return res.json({
          connected: false,
          connection: null
        });
      }
    }

    // Test the connection by making a simple API call to Jobber
    try {
      const testResponse = await fetch('https://api.getjobber.com/api/users/me', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`
        }
      });
      
      if (!testResponse.ok) {
        console.log('Jobber API test failed, marking as disconnected');
        // Delete invalid connection
        await supabase
          .from('crm_connections')
          .delete()
          .eq('id', connection.id);
        
        return res.json({
          connected: false,
          connection: null
        });
      }
    } catch (testError) {
      console.log('Jobber API test error, marking as disconnected:', testError.message);
      // Delete invalid connection
      await supabase
        .from('crm_connections')
        .delete()
        .eq('id', connection.id);
      
      return res.json({
        connected: false,
        connection: null
      });
    }

    res.json({
      connected: true,
      connection: connection
    });

  } catch (error) {
    console.error('Jobber status error:', error);
    res.status(500).json({ error: 'Status check failed' });
  }
});

app.delete('/api/crm/jobber/disconnect', async (req, res) => {
  try {
    const { business_id } = req.body;
    
    if (!business_id) {
      return res.status(400).json({ error: 'Business ID required' });
    }

    // First, get the access token to call appDisconnect mutation
    const { data: connection } = await supabase
      .from('crm_connections')
      .select('access_token')
      .eq('business_id', business_id)
      .eq('crm_type', 'jobber')
      .single();

    // Call Jobber's appDisconnect mutation if we have a token
    if (connection && connection.access_token) {
      try {
        const disconnectResponse = await fetch('https://api.getjobber.com/api/graphql', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              mutation Disconnect {
                appDisconnect {
                  app {
                    name
                    author
                  }
                  userErrors {
                    message
                  }
                }
              }
            `
          })
        });

        const disconnectResult = await disconnectResponse.json();
        console.log('Jobber appDisconnect result:', disconnectResult);
      } catch (disconnectError) {
        console.error('Failed to call Jobber appDisconnect:', disconnectError);
        // Continue with local disconnect even if Jobber call fails
      }
    }

    // Remove from our database
    const { error } = await supabase
      .from('crm_connections')
      .delete()
      .eq('business_id', business_id)
      .eq('crm_type', 'jobber');

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to disconnect' });
    }

    res.json({ success: true, message: 'Disconnected successfully' });

  } catch (error) {
    console.error('Jobber disconnect error:', error);
    res.status(500).json({ error: 'Disconnect failed' });
  }
});

app.post('/api/crm/jobber/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-jobber-hmac-sha256'];
    const clientSecret = process.env.JOBBER_CLIENT_SECRET;

    if (!signature || !clientSecret) {
      console.error('Missing webhook signature or client secret');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get raw body for HMAC verification
    const rawBody = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', clientSecret)
      .update(rawBody)
      .digest('base64');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = req.body;
    console.log('Jobber webhook received:', JSON.stringify(payload, null, 2));

    const eventType = payload.event;
    if (eventType === 'job.closed' || eventType === 'job.completed') {
      await handleJobCompleted(payload);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Jobber webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Helper function to set up Jobber webhook
async function setupJobberWebhook(accessToken, businessId) {
  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://myblipp.com'}/api/crm/jobber/webhook`;
  
  const webhookResponse = await fetch('https://api.getjobber.com/api/webhooks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: webhookUrl,
      events: ['job.closed']
    })
  });

  if (webhookResponse.ok) {
    const webhook = await webhookResponse.json();
    console.log('Jobber webhook created:', webhook);
    
    // Store webhook ID for potential cleanup later
    await supabase
      .from('crm_connections')
      .update({ webhook_id: webhook.id })
      .eq('business_id', businessId)
      .eq('crm_type', 'jobber');
  } else {
    console.error('Failed to create Jobber webhook:', await webhookResponse.text());
  }
}

// Helper function to handle job completed events
async function handleJobCompleted(payload) {
  try {
    console.log('🎯 Handling job completed event:', payload);
    
    // Extract customer and job information
    const customer = payload.data?.customer;
    const job = payload.data?.job;
    const serviceType = job?.service_type;
    
    if (!customer || !job) {
      console.error('❌ Missing customer or job data in webhook payload');
      return;
    }

    console.log('📋 Job details:', {
      customer: customer.name,
      email: customer.email,
      serviceType: serviceType,
      jobId: job.id
    });

    // Find the business that has this Jobber connection
    const { data: connection } = await supabase
      .from('crm_connections')
      .select('business_id')
      .eq('crm_type', 'jobber')
      .single();

    if (!connection) {
      console.error('❌ No Jobber connection found');
      return;
    }

    console.log('🏢 Found business connection:', connection.business_id);

    // Use AI to find the best matching template
    console.log('🤖 Using AI to find best template match for:', serviceType);
    
    const aiMatchResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://myblipp.com'}/api/ai/match-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobberServiceType: serviceType,
        businessId: connection.business_id
      })
    });

    if (!aiMatchResponse.ok) {
      console.error('❌ AI template matching failed:', aiMatchResponse.status);
      return;
    }

    const aiMatchResult = await aiMatchResponse.json();
    const template = aiMatchResult.matchedTemplate;

    if (!template) {
      console.error('❌ No template found for service type:', serviceType);
      return;
    }

    console.log('🎯 AI Template Match:', {
      id: template.id,
      name: template.name,
      confidence: aiMatchResult.confidence,
      reasoning: aiMatchResult.reasoning,
      serviceType: serviceType
    });

    // Create or find customer
    let customerId;
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, full_name, email, phone')
      .eq('email', customer.email)
      .eq('business_id', connection.business_id)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      console.log('👤 Using existing customer:', existingCustomer.full_name);
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          business_id: connection.business_id,
          full_name: customer.name,
          email: customer.email,
          phone: customer.phone,
          source: 'jobber_webhook',
          status: 'active'
        })
        .select('id, full_name')
        .single();

      if (customerError) {
        console.error('❌ Error creating customer:', customerError);
        return;
      }
      customerId = newCustomer.id;
      console.log('👤 Created new customer:', newCustomer.full_name);
    }

    // Generate review link
    const reviewLink = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://myblipp.com'}/r/${Math.random().toString(36).substring(2, 10)}`;

    // Create review request directly (bypass automation_triggers for now)
    const { data: reviewRequest, error: reviewRequestError } = await supabase
      .from('review_requests')
      .insert({
        business_id: connection.business_id,
        customer_id: customerId,
        channel: 'email', // Default to email for now
        status: 'pending',
        review_link: reviewLink,
        trigger_type: 'jobber_job_completed',
        trigger_data: {
          jobber_job_id: job.id,
          service_type: serviceType,
          customer_name: customer.name,
          customer_email: customer.email
        }
      })
      .select('id')
      .single();

    if (reviewRequestError) {
      console.error('❌ Error creating review request:', reviewRequestError);
      return;
    }

    console.log('📝 Created review request:', reviewRequest.id);

    // Get template message and customize it
    const templateMessage = template.config_json?.message || template.custom_message || 
      `Hi {{customer.name}}, thank you for choosing us for your ${serviceType} service! We hope you were satisfied. Please take a moment to leave us a review at {{review_link}}.`;

    // Replace template variables
    const customizedMessage = templateMessage
      .replace(/\{\{customer\.name\}\}/g, customer.name)
      .replace(/\{\{customer_name\}\}/g, customer.name)
      .replace(/\{\{business\.name\}\}/g, 'Your Business') // TODO: Get actual business name
      .replace(/\{\{business_name\}\}/g, 'Your Business')
      .replace(/\{\{review_link\}\}/g, reviewLink);

    // Send email immediately
    console.log('📧 Sending email...');
    
    // Import Resend functionality
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@myblipp.com',
        to: [customer.email],
        subject: "We'd love your feedback!",
        html: customizedMessage.replace(/\n/g, '<br>'),
        text: customizedMessage,
      }),
    });

    if (emailResponse.ok) {
      const emailData = await emailResponse.json();
      console.log('✅ Email sent successfully:', emailData.id);
      
      // Update review request status
      await supabase
        .from('review_requests')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', reviewRequest.id);
        
      console.log('🎉 Jobber integration complete! Email sent to:', customer.email);
    } else {
      const errorData = await emailResponse.text();
      console.error('❌ Email sending failed:', emailResponse.status, errorData);
      
      // Update review request status to failed
      await supabase
        .from('review_requests')
        .update({
          status: 'failed'
        })
        .eq('id', reviewRequest.id);
    }

  } catch (error) {
    console.error('❌ Error handling job completed:', error);
  }
}

// ============================================================================
// EMAIL & SMS SENDING API
// ============================================================================

// Send email via Resend
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@myblipp.com',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
      }),
    });

    if (emailResponse.ok) {
      const emailData = await emailResponse.json();
      res.json({ success: true, messageId: emailData.id });
    } else {
      const errorData = await emailResponse.text();
      console.error('Email sending failed:', emailResponse.status, errorData);
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Email API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send SMS via Twilio
app.post('/api/send-sms', async (req, res) => {
  try {
    const { to, body } = req.body;
    
    if (!to || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return res.status(500).json({ error: 'Twilio not configured' });
    }

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: to,
        Body: body,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      res.json({ success: true, messageId: data.sid });
    } else {
      const errorData = await response.text();
      console.error('SMS sending failed:', response.status, errorData);
      res.status(500).json({ error: 'Failed to send SMS' });
    }
  } catch (error) {
    console.error('SMS API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Review request scheduling endpoint
app.post('/api/review-requests/schedule', async (req, res) => {
  try {
    const { businessId, items, dryRun } = req.body;
    
    if (!businessId || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Calculate best send times for magic strategy
    const previews = items.map((item) => {
      let bestSendAt = null;
      if (item.strategy === 'magic') {
        // Simple magic timing - send 2 hours after job completion or next business day at 10 AM
        const jobEndTime = item.job_end_at ? new Date(item.job_end_at) : new Date();
        const sendTime = new Date(jobEndTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
        
        // If it's after 6 PM, schedule for next day at 10 AM
        if (sendTime.getHours() >= 18) {
          sendTime.setDate(sendTime.getDate() + 1);
          sendTime.setHours(10, 0, 0, 0);
        }
        
        bestSendAt = sendTime.toISOString();
      }
      return { 
        customerId: item.customerId, 
        strategy: item.strategy, 
        best_send_at: bestSendAt 
      };
    });

    if (dryRun) {
      return res.json({ previews });
    }

    // Insert review requests
    const toInsert = items.map(item => {
      const bestSendAt = item.strategy === 'magic' ? 
        (new Date(Date.now() + 2 * 60 * 60 * 1000)).toISOString() : 
        new Date().toISOString();
        
      return {
        business_id: businessId,
        customer_id: item.customerId,
        channel: item.channel || 'email',
        status: item.strategy === 'magic' ? 'scheduled' : 'pending',
        best_send_at: item.strategy === 'magic' ? bestSendAt : null,
        review_link: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://myblipp.com'}/r/${Math.random().toString(36).substring(2, 10)}`
      };
    });

    const { data: inserted, error } = await supabase
      .from('review_requests')
      .insert(toInsert)
      .select('id, business_id, status, best_send_at');

    if (error) {
      console.error('Failed to insert review requests:', error);
      return res.status(500).json({ error: 'Failed to insert review requests' });
    }

    // Create scheduled jobs for magic strategy
    const jobs = inserted
      .filter(r => r.status === 'scheduled' && r.best_send_at)
      .map(r => ({
        business_id: r.business_id,
        job_type: 'send_review_request',
        payload: { review_request_id: r.id },
        scheduled_for: r.best_send_at,
        status: 'queued'
      }));

    if (jobs.length > 0) {
      await supabase.from('scheduled_jobs').insert(jobs);
    }

    res.json({ 
      success: true, 
      inserted: inserted.length,
      previews: previews
    });

  } catch (error) {
    console.error('Schedule review requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send review request now endpoint
app.post('/api/review-requests/send-now', async (req, res) => {
  try {
    const { review_request_id } = req.body;
    
    if (!review_request_id) {
      return res.status(400).json({ error: 'Missing review_request_id' });
    }

    // Get review request with customer and business data
    const { data: reviewRequest, error: requestError } = await supabase
      .from('review_requests')
      .select(`
        id, business_id, customer_id, channel, review_link,
        customers!inner(full_name, email, phone),
        businesses!inner(name, email)
      `)
      .eq('id', review_request_id)
      .single();

    if (requestError || !reviewRequest) {
      return res.status(404).json({ error: 'Review request not found' });
    }

    const customer = reviewRequest.customers;
    const business = reviewRequest.businesses;

    // Prepare message
    let message, subject;
    const reviewLink = reviewRequest.review_link;
    
    if (reviewRequest.channel === 'email') {
      subject = "We'd love your feedback!";
      message = `Hi ${customer.full_name},

Thank you for choosing ${business.name}! We would really appreciate if you could take a moment to share your experience with us.

${reviewLink}

Your feedback helps us improve and serve our customers better.
Best regards,
${business.name}`;
    } else {
      // SMS
      message = `Hi ${customer.full_name}! Thanks for choosing ${business.name}. We'd love your feedback: ${reviewLink}`;
    }

    let sendResult;
    const sentAt = new Date().toISOString();

    // Send via appropriate channel
    if (reviewRequest.channel === 'email') {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@myblipp.com',
          to: [customer.email],
          subject: subject,
          html: message.replace(/\n/g, '<br>'),
          text: message,
        }),
      });

      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        sendResult = { messageId: emailData.id };
      } else {
        throw new Error('Email sending failed');
      }
    } else {
      // SMS via Twilio
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      const smsResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: customer.phone,
          Body: message,
        }),
      });

      if (smsResponse.ok) {
        const smsData = await smsResponse.json();
        sendResult = { messageId: smsData.sid };
      } else {
        throw new Error('SMS sending failed');
      }
    }

    // Update review request status
    await supabase
      .from('review_requests')
      .update({
        status: 'sent',
        sent_at: sentAt,
        delivered_at: sentAt
      })
      .eq('id', review_request_id);

    res.json({ 
      success: true, 
      messageId: sendResult.messageId,
      sentAt: sentAt
    });

  } catch (error) {
    console.error('Send review request error:', error);
    res.status(500).json({ error: 'Failed to send review request' });
  }
});

// ============================================================================
// AUTOMATION PROCESSOR
// ============================================================================
// Process scheduled jobs (can be called by cron or manually)
app.post('/api/cron/process-scheduled-jobs', async (req, res) => {
  try {
    const now = new Date().toISOString();
    console.log('🕐 Processing scheduled jobs at:', now);
    
    // Get due jobs
    const { data: dueJobs, error: jobsError } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .lte('scheduled_for', now)
      .eq('status', 'queued')
      .limit(50);

    if (jobsError) {
      console.error('❌ Error fetching scheduled jobs:', jobsError);
      return res.status(500).json({ error: 'Failed to fetch scheduled jobs' });
    }

    if (!dueJobs || dueJobs.length === 0) {
      console.log('✅ No scheduled jobs to process');
      return res.json({ success: true, processed: 0 });
    }

    console.log(`📋 Processing ${dueJobs.length} scheduled jobs`);

    let processed = 0;
    let failed = 0;

    for (const job of dueJobs) {
      try {
        console.log(`🔄 Processing job ${job.id}: ${job.job_type}`);
        
        // Update job status to processing
        await supabase
          .from('scheduled_jobs')
          .update({ status: 'processing', started_at: now })
          .eq('id', job.id);

        let success = false;

        switch (job.job_type) {
          case 'send_review_request':
            success = await processSendReviewRequest(job);
            break;
          case 'send_review_request_now':
            success = await processSendReviewRequestNow(job);
            break;
          default:
            console.warn(`⚠️ Unknown job type: ${job.job_type}`);
            success = false;
        }

        // Update job status
        await supabase
          .from('scheduled_jobs')
          .update({ 
            status: success ? 'completed' : 'failed',
            completed_at: new Date().toISOString(),
            error_message: success ? null : 'Job processing failed'
          })
          .eq('id', job.id);

        if (success) {
          processed++;
          console.log(`✅ Job ${job.id} completed successfully`);
        } else {
          failed++;
          console.error(`❌ Job ${job.id} failed`);
        }

      } catch (jobError) {
        console.error(`❌ Error processing job ${job.id}:`, jobError);
        
        // Update job status to failed
        await supabase
          .from('scheduled_jobs')
          .update({ 
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: jobError.message
          })
          .eq('id', job.id);
        
        failed++;
      }
    }

    console.log(`🎉 Processing complete: ${processed} successful, ${failed} failed`);
    res.json({ 
      success: true, 
      processed: processed + failed,
      successful: processed,
      failed: failed
    });

  } catch (error) {
    console.error('❌ Automation processor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to process send review request jobs
async function processSendReviewRequest(job) {
  try {
    const { review_request_id } = job.payload;
    
    // Call the send-now endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://myblipp.com'}/api/review-requests/send-now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ review_request_id })
    });

    return response.ok;
  } catch (error) {
    console.error('Error processing send review request:', error);
    return false;
  }
}

// Helper function to process immediate send review request jobs
async function processSendReviewRequestNow(job) {
  try {
    const { review_request_id } = job.payload;
    
    // Get review request data
    const { data: reviewRequest, error: requestError } = await supabase
      .from('review_requests')
      .select(`
        id, business_id, customer_id, channel, review_link,
        customers!inner(full_name, email, phone),
        businesses!inner(name, email)
      `)
      .eq('id', review_request_id)
      .single();

    if (requestError || !reviewRequest) {
      console.error('Review request not found:', review_request_id);
      return false;
    }

    const customer = reviewRequest.customers;
    const business = reviewRequest.businesses;

    // Prepare message
    let message, subject;
    const reviewLink = reviewRequest.review_link;
    
    if (reviewRequest.channel === 'email') {
      subject = "We'd love your feedback!";
      message = `Hi ${customer.full_name},

Thank you for choosing ${business.name}! We would really appreciate if you could take a moment to share your experience with us.

${reviewLink}

Your feedback helps us improve and serve our customers better.

Best regards,
${business.name}`;
    } else {
      message = `Hi ${customer.full_name}! Thanks for choosing ${business.name}. We'd love your feedback: ${reviewLink}`;
    }

    // Send email or SMS
    if (reviewRequest.channel === 'email') {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@myblipp.com',
          to: [customer.email],
          subject: subject,
          html: message.replace(/\n/g, '<br>'),
          text: message,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Email sending failed');
        return false;
      }
    } else {
      // SMS via Twilio
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      const smsResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: customer.phone,
          Body: message,
        }),
      });

      if (!smsResponse.ok) {
        console.error('SMS sending failed');
        return false;
      }
    }

    // Update review request status
    await supabase
      .from('review_requests')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', review_request_id);

    return true;

  } catch (error) {
    console.error('Error processing immediate send review request:', error);
    return false;
  }
}

// ============================================================================
// AI TEMPLATE MATCHING API
// ============================================================================

// AI-powered template matching endpoint
app.post('/api/ai/match-template', async (req, res) => {
  try {
    const { jobberServiceType, businessId } = req.body;
    
    if (!jobberServiceType || !businessId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('🤖 AI Template Matching Request:', { jobberServiceType, businessId });

    // Get all active templates for this business
    const { data: templates, error: templatesError } = await supabase
      .from('automation_templates')
      .select('id, name, service_types, is_default, config_json')
      .eq('business_id', businessId)
      .eq('status', 'active');

    if (templatesError) {
      console.error('❌ Error fetching templates:', templatesError);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }

    if (!templates || templates.length === 0) {
      console.log('⚠️ No templates found for business');
      return res.json({ 
        success: true, 
        matchedTemplate: null, 
        confidence: 0,
        reason: 'No templates available'
      });
    }

    // Prepare template data for AI
    const templateData = templates.map(template => ({
      id: template.id,
      name: template.name,
      serviceTypes: template.service_types || [],
      isDefault: template.is_default || false,
      description: template.config_json?.description || template.name
    }));

    // Call OpenAI to find the best match
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Use the cheaper model
        messages: [
          {
            role: 'system',
            content: `You are a template matching assistant. Your job is to find the best automation template for a given service type.

Given a Jobber service type and a list of available templates, return the template that best matches the service type.

Consider:
- Semantic similarity (meaning, not just exact words)
- Service category matching
- Default template as fallback

Return ONLY a JSON response with this exact format:
{
  "matchedTemplateId": "template_id_or_null",
  "confidence": 0.0_to_1.0,
  "reasoning": "brief explanation of why this template was chosen"
}`
          },
          {
            role: 'user',
            content: `Jobber Service Type: "${jobberServiceType}"

Available Templates:
${templateData.map(t => `- ID: ${t.id}, Name: "${t.name}", Service Types: [${t.serviceTypes.join(', ')}], Is Default: ${t.isDefault}, Description: "${t.description}"`).join('\n')}

Find the best matching template for the Jobber service type.`
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      })
    });

    if (!aiResponse.ok) {
      console.error('❌ OpenAI API error:', aiResponse.status, await aiResponse.text());
      // Fallback to default template
      const defaultTemplate = templates.find(t => t.is_default);
      return res.json({
        success: true,
        matchedTemplate: defaultTemplate || null,
        confidence: 0.1,
        reason: 'AI matching failed, using fallback'
      });
    }

    const aiData = await aiResponse.json();
    const aiChoice = aiData.choices[0]?.message?.content;

    if (!aiChoice) {
      console.error('❌ No AI response received');
      const defaultTemplate = templates.find(t => t.is_default);
      return res.json({
        success: true,
        matchedTemplate: defaultTemplate || null,
        confidence: 0.1,
        reason: 'No AI response, using fallback'
      });
    }

    // Parse AI response
    let aiResult;
    try {
      aiResult = JSON.parse(aiChoice);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', aiChoice);
      const defaultTemplate = templates.find(t => t.is_default);
      return res.json({
        success: true,
        matchedTemplate: defaultTemplate || null,
        confidence: 0.1,
        reason: 'AI response parse error, using fallback'
      });
    }

    // Find the matched template
    const matchedTemplate = templates.find(t => t.id === aiResult.matchedTemplateId);

    console.log('🎯 AI Template Match Result:', {
      jobberServiceType,
      matchedTemplate: matchedTemplate?.name || 'None',
      confidence: aiResult.confidence,
      reasoning: aiResult.reasoning
    });

    res.json({
      success: true,
      matchedTemplate: matchedTemplate || null,
      confidence: aiResult.confidence || 0,
      reasoning: aiResult.reasoning || 'No reasoning provided'
    });

  } catch (error) {
    console.error('❌ AI Template Matching Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// NOTIFICATIONS API
// ============================================================================

app.get('/api/notifications', async (req, res) => {
  try {
    const { business_id } = req.query;
    
    if (!business_id) {
      return res.status(400).json({ error: 'Business ID required' });
    }

    // For now, return mock notifications
    // Later this would query a notifications table
    const mockNotifications = [
      {
        id: 1,
        type: 'email_sent',
        title: 'Review request sent',
        message: 'Email sent to Sarah Johnson for HVAC service',
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        read: false,
        route: 'AutomatedRequests'
      },
      {
        id: 2,
        type: 'review_received',
        title: 'New 5-star review',
        message: 'Mike Thompson left a 5-star review on Google',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        read: false,
        route: 'ReviewInbox'
      },
      {
        id: 3,
        type: 'sms_sent',
        title: 'SMS sent successfully',
        message: 'Text message delivered to Emily Rodriguez',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        read: true,
        route: 'Conversations'
      }
    ];

    const unreadCount = mockNotifications.filter(n => !n.read).length;

    res.json({
      notifications: mockNotifications,
      unreadCount: unreadCount
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    // For now, just return success
    // Later this would update the notifications table
    res.json({ success: true });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

app.put('/api/notifications/mark-all-read', async (req, res) => {
  try {
    // For now, just return success
    // Later this would update the notifications table
    res.json({ success: true });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Enhanced Reviews API Routes (removed duplicate - using the simpler one below)

// Get review analytics/KPIs
app.get('/api/reviews/analytics', async (req, res) => {
  try {
    const { business_id, date_from, date_to } = req.query;
    
    if (!business_id) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let dateFilter = '';
    if (date_from && date_to) {
      dateFilter = `AND review_created_at >= '${date_from}' AND review_created_at <= '${date_to}'`;
    }

    // Get response rate
    const { count: totalReviews } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business_id)
      .neq('reply_text', null);

    const { count: respondedReviews } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business_id)
      .not('reply_text', 'is', null);

    // Get average rating
    const { data: ratingData } = await supabase
      .from('reviews')
      .select('rating')
      .eq('business_id', business_id);

    const avgRating = ratingData?.length > 0 
      ? ratingData.reduce((sum, r) => sum + r.rating, 0) / ratingData.length 
      : 0;

    // Get SLA compliance
    const { count: slaViolations } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business_id)
      .not('due_at', 'is', null)
      .lt('due_at', new Date().toISOString())
      .in('status', ['unread', 'needs_response']);

    // Get new reviews this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { count: newReviews } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business_id)
      .gte('review_created_at', weekAgo.toISOString());

    res.json({
      totalReviews: totalReviews || 0,
      responseRate: totalReviews > 0 ? ((respondedReviews || 0) / totalReviews * 100).toFixed(1) : 0,
      averageRating: avgRating.toFixed(1),
      slaCompliance: totalReviews > 0 ? (((totalReviews - (slaViolations || 0)) / totalReviews) * 100).toFixed(1) : 100,
      newReviewsThisWeek: newReviews || 0,
      unrepliedReviews: (totalReviews || 0) - (respondedReviews || 0)
    });
  } catch (error) {
    console.error('Reviews analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new review
app.post('/api/reviews', async (req, res) => {
  try {
    const { 
      business_id, 
      platform, 
      reviewer_name, 
      reviewer_email, 
      reviewer_phone, 
      rating, 
      review_text, 
      review_url,
      platform_review_id,
      job_id,
      job_type,
      job_notes,
      topics,
      tags
    } = req.body;

    if (!business_id || !platform || !reviewer_name || !rating || !review_text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        business_id,
        platform,
        platform_review_id,
        reviewer_name,
        reviewer_email,
        reviewer_phone,
        rating: parseInt(rating),
        review_text,
        review_created_at: new Date().toISOString(),
        review_url,
        job_id,
        job_type,
        job_notes,
        topics: topics ? topics.split(',').map(t => t.trim()) : [],
        tags: tags ? tags.split(',').map(t => t.trim()) : []
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating review:', error);
      return res.status(500).json({ error: 'Failed to create review' });
    }

    res.json({ review });
  } catch (error) {
    console.error('Create review API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk actions for reviews
app.post('/api/reviews/bulk-action', async (req, res) => {
  try {
    const { 
      business_id, 
      review_ids, 
      action, 
      assigned_to, 
      tags, 
      status 
    } = req.body;

    if (!business_id || !review_ids || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let updateData = {};
    
    switch (action) {
      case 'assign':
        if (!assigned_to) {
          return res.status(400).json({ error: 'assigned_to is required for assign action' });
        }
        updateData.assigned_to = assigned_to;
        break;
      case 'tag':
        if (!tags) {
          return res.status(400).json({ error: 'tags are required for tag action' });
        }
        updateData.tags = tags.split(',').map(t => t.trim());
        break;
      case 'status':
        if (!status) {
          return res.status(400).json({ error: 'status is required for status action' });
        }
        updateData.status = status;
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    const { data: reviews, error } = await supabase
      .from('reviews')
      .update(updateData)
      .in('id', review_ids)
      .eq('business_id', business_id)
      .select();

    if (error) {
      console.error('Error performing bulk action:', error);
      return res.status(500).json({ error: 'Failed to perform bulk action' });
    }

    res.json({ updatedReviews: reviews });
  } catch (error) {
    console.error('Bulk action API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get response templates
app.get('/api/reviews/templates', async (req, res) => {
  try {
    const { business_id, platform, sentiment } = req.query;
    
    if (!business_id) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from('review_response_templates')
      .select('*')
      .eq('business_id', business_id);

    if (platform && platform !== 'all') {
      query = query.or(`platform.is.null,platform.eq.${platform}`);
    }

    if (sentiment && sentiment !== 'all') {
      query = query.or(`sentiment.is.null,sentiment.eq.${sentiment}`);
    }

    query = query.order('usage_count', { ascending: false });

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }

    res.json({ templates });
  } catch (error) {
    console.error('Templates API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Create response template
app.post('/api/reviews/templates', async (req, res) => {
  try {
    const { 
      business_id, 
      name, 
      template_text, 
      platform, 
      sentiment, 
      job_type, 
      tone 
    } = req.body;

    if (!business_id || !name || !template_text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: template, error } = await supabase
      .from('review_response_templates')
      .insert({
        business_id,
        name,
        template_text,
        platform,
        sentiment,
        job_type,
        tone: tone || 'professional'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return res.status(500).json({ error: 'Failed to create template' });
    }

    res.json({ template });
  } catch (error) {
    console.error('Create template API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { response_status, response_text, response_url } = req.body;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const updates = {};
    if (response_status) updates.response_status = response_status;
    if (response_text) updates.response_text = response_text;
    if (response_url) updates.response_url = response_url;
    
    if (response_status === 'responded') {
      updates.response_date = new Date().toISOString();
    }

    const { data: review, error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating review:', error);
      return res.status(500).json({ error: 'Failed to update review' });
    }

    res.json({ review });
  } catch (error) {
    console.error('Update review API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Feedback Cases API
app.get('/api/feedback/cases', async (req, res) => {
  try {
    const { business_id } = req.query;
    
    if (!business_id) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    const { data: cases, error } = await supabase
      .from('feedback_cases')
      .select(`
        *,
        review:reviews(
          id,
          platform,
          rating,
          review_text,
          review_url
        )
      `)
      .eq('business_id', business_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feedback cases:', error);
      return res.status(500).json({ error: 'Failed to fetch feedback cases' });
    }

    res.json({ cases: cases || [] });
  } catch (error) {
    console.error('Error in feedback cases API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/feedback/cases', async (req, res) => {
  try {
    const { business_id, title, description, priority, customer_name, customer_email, customer_phone, tags, category } = req.body;
    
    if (!business_id || !title) {
      return res.status(400).json({ error: 'Business ID and title are required' });
    }

    const { data: case_, error } = await supabase
      .from('feedback_cases')
      .insert({
        business_id,
        title,
        description,
        priority: priority || 'medium',
        customer_name,
        customer_email,
        customer_phone,
        tags: tags || [],
        category: category || 'general'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating feedback case:', error);
      return res.status(500).json({ error: 'Failed to create feedback case' });
    }

    res.json({ case_ });
  } catch (error) {
    console.error('Error in create feedback case API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/feedback/cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: case_, error } = await supabase
      .from('feedback_cases')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating feedback case:', error);
      return res.status(500).json({ error: 'Failed to update feedback case' });
    }

    res.json({ case_ });
  } catch (error) {
    console.error('Error in update feedback case API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Send negative review alert
async function sendNegativeReviewAlert(review, businessId) {
  try {
    // Get business owner email from profiles table
    const { data: businessOwner } = await supabase
      .from('profiles')
      .select('email')
      .eq('business_id', businessId)
      .single();

    if (!businessOwner?.email) {
      console.log('No business owner email found for business:', businessId);
      return;
    }

    // Send email alert (you can implement this with your email service)
    console.log('Sending negative review alert to:', businessOwner.email, 'for review:', review.id);
    
    // For now, just log the alert - you can integrate with Resend or another email service
    console.log('NEGATIVE REVIEW ALERT:', {
      businessId,
      reviewId: review.id,
      rating: review.rating,
      reviewerName: review.reviewer_name,
      reviewText: review.review_text.substring(0, 100) + '...',
      ownerEmail: businessOwner.email
    });
  } catch (error) {
    console.error('Error sending negative review alert:', error);
  }
}

// AI-powered review classification
async function classifyReviewWithAI(reviewText, rating) {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `Analyze this customer review and classify it:

Review: "${reviewText}"
Rating: ${rating}/5 stars

Please classify this review and determine:
1. Status: Should this be "unread", "needs_response", or "responded"?
   - "needs_response": Bad reviews (1-2 stars), complaints, issues, or reviews mentioning problems
   - "unread": Good reviews (4-5 stars) that don't need immediate response
   - "responded": Already has a response (we'll handle this separately)

2. Sentiment: "positive", "neutral", or "negative"
3. Summary: A brief 1-2 sentence summary of what the customer is saying

Respond in JSON format:
{
  "status": "needs_response",
  "sentiment": "negative", 
  "summary": "Customer complained about pricing and service quality",
  "reason": "Brief explanation of classification"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.1
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      const classification = JSON.parse(data.choices[0].message.content);
      return classification;
    } else {
      throw new Error('No classification received from AI');
    }
  } catch (error) {
    console.error('AI classification error:', error);
    // Fallback classification
    if (rating <= 2) {
      return {
        status: 'needs_response',
        sentiment: 'negative',
        needs_response: true,
        reason: 'Low rating - needs response'
      };
    } else if (rating >= 4) {
      return {
        status: 'unread',
        sentiment: 'positive',
        needs_response: false,
        reason: 'High rating - no response needed'
      };
    } else {
      return {
        status: 'unread',
        sentiment: 'neutral',
        needs_response: false,
        reason: 'Neutral rating'
      };
    }
  }
}

// Direct reply posting to platforms - disabled, using Copy & Post workflow instead
async function postReplyToPlatform(platform, replyText, reviewId, businessId) {
  return {
    success: false,
    error: 'Direct posting is disabled. Please use the Copy & Post workflow to respond to reviews.'
  };
}

// Helper function to sync reviews directly
async function syncReviewsDirectly({ business_id, place_id, platform, limit, user_email }) {
  try {
    console.log('=== DIRECT SYNC DEBUG ===');
    console.log('Direct sync params:', { business_id, place_id, platform, limit, user_email });
    console.log('🔍 PLACE ID BEING USED:', place_id);
    
    if (platform === 'google') {
      // Use Google Places API to fetch real reviews
      const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
      console.log('Google API Key available:', !!googleApiKey);
      console.log('Google API Key length:', googleApiKey ? googleApiKey.length : 0);
      
      if (!googleApiKey) {
        return { success: false, error: 'Google Places API key not configured' };
      }

      // First, get place details to fetch reviews
      const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,rating,reviews,user_ratings_total,formatted_address&key=${googleApiKey}`;
      console.log('Google Places API URL:', placeDetailsUrl);
      
      const placeDetailsResponse = await fetch(placeDetailsUrl);
      const placeData = await placeDetailsResponse.json();
      
                console.log('Google Places API response status:', placeData.status);
                console.log('Place data result:', placeData.result);
                
                if (placeData.status !== 'OK') {
                  console.error('Google Places API error:', placeData.status, placeData.error_message);
                  return { success: false, error: 'Failed to fetch place details: ' + placeData.status };
                }

                const place = placeData.result;
                const reviews = place.reviews || [];
                console.log('Reviews found:', reviews.length);
                console.log('Place name from API:', place.name);
                console.log('Place rating:', place.rating);
                console.log('Total ratings:', place.user_ratings_total);
                console.log('🔍 VERIFYING: Is this the right business?');
                console.log('Expected business should be "Shirley Dentistry" or similar');
                
                // Debug the reviews array structure
                if (reviews.length > 0) {
                  console.log('✅ Reviews array exists with', reviews.length, 'items');
                  console.log('First review structure:', {
                    hasAuthor: !!reviews[0].author_name,
                    hasRating: !!reviews[0].rating,
                    hasText: !!reviews[0].text,
                    hasTime: !!reviews[0].time,
                    authorName: reviews[0].author_name,
                    rating: reviews[0].rating
                  });
                } else {
                  console.log('❌ Reviews array is empty or undefined');
                  console.log('Place object keys:', Object.keys(place));
                }
                
                if (reviews.length === 0) {
                  console.log('❌ No reviews found in Google Places API for this business');
                  console.log('This could mean: 1) Business has no reviews, 2) Business name mismatch, 3) API permissions issue');
                } else {
                  console.log('✅ Reviews found! Processing reviews...');
                  console.log('Sample review data:', reviews[0]);
                }

      // Sort reviews by date (newest first) and limit to requested amount
      const sortedReviews = reviews
        .sort((a, b) => (b.time || 0) - (a.time || 0))
        .slice(0, parseInt(limit));

      // Convert Google reviews to our format
      console.log('Converting reviews to our format...');
      console.log('Sorted reviews count:', sortedReviews.length);
      
      const formattedReviews = sortedReviews.map((review, index) => {
        console.log(`Processing review ${index + 1}:`, {
          author_name: review.author_name,
          rating: review.rating,
          text_length: review.text?.length || 0,
          time: review.time
        });
        
        return {
          business_id,
          platform: 'google',
          reviewer_name: review.author_name || 'Anonymous',
          rating: review.rating || 5,
          review_text: review.text || '',
          review_url: review.author_url || `https://www.google.com/maps/place/?q=place_id:${place_id}`,
          review_created_at: new Date(review.time * 1000).toISOString(),
          status: 'unread',
          created_by: user_email
        };
      });

      console.log('Formatted reviews:', formattedReviews.length);
      console.log('Sample formatted review:', formattedReviews[0]);

      if (formattedReviews.length === 0) {
        return { success: true, message: 'No reviews found for this business', count: 0 };
      }

      // Classify reviews with basic logic (skip AI for now to avoid blocking)
      console.log('Classifying reviews with basic logic...');
      const classifiedReviews = formattedReviews.map(review => {
        // Basic classification without AI
        const status = review.rating >= 4 ? 'unread' : (review.rating >= 3 ? 'unread' : 'needs_response');
        const sentiment = review.rating >= 4 ? 'positive' : (review.rating >= 3 ? 'neutral' : 'negative');
        
        return {
          ...review,
          status: status,
          sentiment: sentiment
          // Removed ai_summary field - doesn't exist in database schema
        };
      });

                // Upsert reviews to database
                console.log('Attempting to upsert reviews to database...');
                console.log('Reviews to upsert:', classifiedReviews.length);
                console.log('Sample review to upsert:', classifiedReviews[0]);
                
                const { data: upsertData, error } = await supabase
                  .from('reviews')
                  .upsert(classifiedReviews, { 
                    ignoreDuplicates: true 
                  })
                  .select();

                if (error) {
                  console.error('❌ Database upsert error:', error);
                  console.error('Error details:', error.message, error.details, error.hint);
                  throw error;
                } else {
                  console.log('✅ Reviews successfully upserted to database');
                  console.log('Upsert result:', upsertData?.length || 'no data returned');
                }

      // Send alerts for negative reviews
      console.log('Checking for negative reviews to alert...');
      const negativeReviews = classifiedReviews.filter(review => 
        review.status === 'needs_response' || review.rating <= 2
      );
      
      for (const review of negativeReviews) {
        await sendNegativeReviewAlert({
          ...review,
          id: review.review_id,
          business_id: businessId
        }, businessId);
      }

                console.log('=== FINAL SYNC RESULT ===');
                console.log('Reviews formatted:', formattedReviews.length);
                console.log('Reviews total available:', reviews.length);
                console.log('Reviews imported:', formattedReviews.length);
                
                return { 
                  success: true, 
                  message: `Loaded ${formattedReviews.length} of ${reviews.length} total reviews`, 
                  count: formattedReviews.length,
                  reviews_imported: formattedReviews.length,
                  total_available: reviews.length,
                  has_more: reviews.length > parseInt(limit),
                  debug_info: {
                    place_name: place.name,
                    place_rating: place.rating,
                    total_ratings: place.user_ratings_total,
                    reviews_found: reviews.length,
                    reviews_processed: formattedReviews.length,
                    sample_review: formattedReviews[0] ? {
                      author: formattedReviews[0].reviewer_name,
                      rating: formattedReviews[0].rating,
                      text: formattedReviews[0].review_text?.substring(0, 100) + '...'
                    } : null
                  }
                };
    } else {
      return { success: false, error: 'Unsupported platform' };
    }
  } catch (error) {
    console.error('Error in direct sync:', error);
    return { success: false, error: 'Failed to sync reviews: ' + error.message };
  }
}

// AI Review Response Generation
app.post('/api/ai/generate-review-response', async (req, res) => {
  try {
    const { review_text, rating, platform, business_name, job_type, sentiment, template_id } = req.body;
    
    if (!review_text) {
      return res.status(400).json({ error: 'Review text is required' });
    }
    
    // Get OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    
    // Create prompt based on review sentiment and rating
    let prompt = `You are a professional customer service representative responding to a ${rating}-star review on ${platform}. 
    
Business: ${business_name || 'Our business'}
Review: "${review_text}"
Sentiment: ${sentiment || 'neutral'}
${job_type ? `Service Type: ${job_type}` : ''}

Please write a professional, helpful response that:
1. Acknowledges the customer's feedback
2. Shows appreciation for their business
3. Addresses any concerns professionally
4. Maintains a positive brand image
5. Is concise (2-3 sentences max)
6. Uses appropriate tone for a ${rating}-star review

Response:`;
    
    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });
    
    const openaiData = await openaiResponse.json();
    
    if (openaiData.choices && openaiData.choices[0] && openaiData.choices[0].message) {
      const response = openaiData.choices[0].message.content.trim();
      
      res.json({
        success: true,
        response: response,
        model: 'gpt-3.5-turbo',
        usage: openaiData.usage
      });
    } else {
      throw new Error('Invalid response from OpenAI API');
    }
    
  } catch (error) {
    console.error('Error generating AI response:', error);
    res.status(500).json({ error: 'Failed to generate AI response: ' + error.message });
  }
});

// Update review endpoint
app.post('/api/reviews/update', async (req, res) => {
  try {
    const { review_id, updates } = req.body;
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization?.replace('Bearer ', ''));
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!review_id || !updates) {
      return res.status(400).json({ error: 'Review ID and updates are required' });
    }

    // Get user's business ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile?.business_id) {
      return res.status(400).json({ error: 'Business profile not found' });
    }

    // Update the review
    const { data, error } = await supabase
      .from('reviews')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', review_id)
      .eq('business_id', profile.business_id)
      .select();

    if (error) {
      console.error('Error updating review:', error);
      return res.status(500).json({ error: 'Failed to update review' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({
      success: true,
      review: data[0],
      message: 'Review updated successfully'
    });

  } catch (error) {
    console.error('Error in review update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI Classification endpoint
app.post('/api/ai/classify-review', async (req, res) => {
  try {
    const { review_text, rating, platform } = req.body;
    
    if (!review_text) {
      return res.status(400).json({ error: 'Review text is required' });
    }
    
    // Get OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    
    // Create classification prompt
    const prompt = `Analyze this customer review and classify it:

Review: "${review_text}"
Rating: ${rating} stars
Platform: ${platform}

Please provide:
1. Sentiment: positive, negative, or neutral
2. Classification: complaint, compliment, question, suggestion, or general
3. Priority: high, medium, or low
4. Keywords: 3-5 key topics mentioned
5. Response needed: yes or no

Format your response as JSON:
{
  "sentiment": "positive|negative|neutral",
  "classification": "complaint|compliment|question|suggestion|general",
  "priority": "high|medium|low",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "response_needed": true|false,
  "summary": "Brief 1-sentence summary of the review"
}`;
    
    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      })
    });
    
    const openaiData = await openaiResponse.json();
    
    if (openaiData.choices && openaiData.choices[0] && openaiData.choices[0].message) {
      const responseText = openaiData.choices[0].message.content.trim();
      
      try {
        const classification = JSON.parse(responseText);
        
        res.json({
          success: true,
          classification: classification,
          model: 'gpt-3.5-turbo',
          usage: openaiData.usage
        });
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        // Fallback classification based on rating
        const sentiment = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';
        const responseNeeded = rating <= 3;
        
        res.json({
          success: true,
          classification: {
            sentiment: sentiment,
            classification: 'general',
            priority: rating <= 2 ? 'high' : rating <= 3 ? 'medium' : 'low',
            keywords: [],
            response_needed: responseNeeded,
            summary: `${rating}-star review`
          },
          fallback: true
        });
      }
    } else {
      throw new Error('Invalid response from OpenAI API');
    }
    
  } catch (error) {
    console.error('Error classifying review:', error);
    res.status(500).json({ error: 'Failed to classify review: ' + error.message });
  }
});
// Start server
// Connect a review source
app.post('/api/reviews/connect-source', async (req, res) => {
  try {
    const { platform, public_url, business_name, external_id, place_id } = req.body;
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization?.replace('Bearer ', ''));
    
    console.log('=== CONNECT SOURCE DEBUG ===');
    console.log('Request body:', { platform, public_url, business_name, external_id, place_id });
    console.log('User:', user?.email);
    
    if (!user) {
      console.log('No user found, returning 401');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's business_id from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    console.log('Profile lookup result:', { profileData, profileError });

    if (!profileData?.business_id) {
      console.log('No business_id found in profile for user:', user.email);
      return res.status(400).json({ error: 'No business found for user' });
    }

    const businessId = profileData.business_id;
    console.log('Using business ID:', businessId);

    // Upsert the review source
    const { error } = await supabase
      .from('review_sources')
      .upsert({
        business_id: businessId,
        platform: platform,
        public_url: public_url,
        business_name: business_name,
        external_id: external_id,
        is_active: true,
        created_by: user.email
      });

    if (error) throw error;

    // Trigger review sync directly (will import only 15 most recent)
    console.log('=== CONNECT SOURCE DEBUG ===');
    console.log('Business ID:', businessId);
    console.log('Place ID:', place_id);
    console.log('Platform:', platform);
    console.log('Business Name:', business_name);
    console.log('User Email:', user.email);
    console.log('Google Places API Key available:', !!process.env.GOOGLE_PLACES_API_KEY);
    console.log('Supabase client available:', !!supabase);
    
    let syncResult = null;
    try {
      // Call sync directly instead of making HTTP request
      syncResult = await syncReviewsDirectly({
        business_id: businessId,
        place_id: place_id,
        platform: platform,
        limit: 50, // Import up to 50 reviews (Google Places API limit)
        user_email: user.email
      });
      
      console.log('=== SYNC RESULT ===');
      console.log('Direct sync result:', syncResult);
      console.log('Reviews imported:', syncResult.reviews_imported || syncResult.count || 0);
      console.log('Total available:', syncResult.total_available || 0);
      console.log('Success:', syncResult.success);
      
      if (!syncResult.success) {
        console.error('Sync failed:', syncResult.error);
      }
    } catch (syncError) {
      console.error('Error syncing reviews:', syncError);
      console.error('Sync error stack:', syncError.stack);
      // Don't fail the connection if sync fails
    }

    res.json({ 
      success: true, 
      message: 'Business connected successfully',
      reviews_imported: syncResult?.reviews_imported || syncResult?.count || 0,
      total_available: syncResult?.total_available || 0,
      sync_success: syncResult?.success || false
    });
  } catch (error) {
    console.error('Error connecting source:', error);
    res.status(500).json({ error: 'Failed to connect source' });
  }
});

// Get connected review sources
app.get('/api/reviews/sources', async (req, res) => {
  try {
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization?.replace('Bearer ', ''));
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's business_id from profiles table
    const { data: profileData } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profileData?.business_id) {
      return res.json({ success: true, sources: [] });
    }

    const { data, error } = await supabase
      .from('review_sources')
      .select('*')
      .eq('business_id', profileData.business_id)
      .eq('is_active', true);

    if (error) throw error;

    res.json({ success: true, sources: data || [] });
  } catch (error) {
    console.error('Error fetching review sources:', error);
    res.status(500).json({ error: 'Failed to fetch review sources' });
  }
});
// Disconnect review source and delete all associated reviews
app.delete('/api/reviews/disconnect-source', async (req, res) => {
  try {
    const { source_id } = req.body;
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization?.replace('Bearer ', ''));
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!source_id) {
      return res.status(400).json({ error: 'Source ID is required' });
    }

    // Get user's business_id from profiles table
    const { data: profileData } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profileData?.business_id) {
      return res.status(400).json({ error: 'Business not found' });
    }

    // Delete the review source
    const { error: deleteSourceError } = await supabase
      .from('review_sources')
      .delete()
      .eq('id', source_id)
      .eq('business_id', profileData.business_id);

    if (deleteSourceError) throw deleteSourceError;

    // Delete all reviews from this source
    const { error: deleteReviewsError } = await supabase
      .from('reviews')
      .delete()
      .eq('business_id', profileData.business_id);

    if (deleteReviewsError) throw deleteReviewsError;

    res.json({ success: true, message: 'Source disconnected and reviews deleted successfully' });
  } catch (error) {
    console.error('Error disconnecting source:', error);
    res.status(500).json({ error: 'Failed to disconnect source' });
  }
});

// Reviews API endpoints
app.get('/api/reviews', async (req, res) => {
  try {
    const { business_id, limit = 50, before } = req.query;
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization?.replace('Bearer ', ''));
    
    console.log('=== REVIEWS API DEBUG ===');
    console.log('Query params:', { business_id, limit, before });
    console.log('User email:', user?.email);
    console.log('User ID:', user?.id);
    console.log('Supabase client available:', !!supabase);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // If business_id is provided, use it. Otherwise, get user's business_id from profiles table
    let targetBusinessId = business_id;
    if (!targetBusinessId) {
      console.log('No business_id provided, looking up from profiles table...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();
      
      console.log('Profile lookup result:', { profileData, profileError });
      
      if (profileData?.business_id) {
        targetBusinessId = profileData.business_id;
        console.log('Found business_id from profile:', targetBusinessId);
      } else {
        console.log('No business_id found in profile for user:', user.email);
      }
    } else {
      console.log('Using provided business_id:', targetBusinessId);
    }

    let query = supabase
      .from('reviews')
      .select('*')
      .order('review_created_at', { ascending: false })
      .limit(parseInt(limit));

    // Filter by business_id if available, otherwise by created_by
    if (targetBusinessId) {
      query = query.eq('business_id', targetBusinessId);
    } else {
      query = query.eq('created_by', user.email);
    }

    // Add pagination cursor if provided
    if (before) {
      query = query.lt('review_created_at', before);
    }

    // Also check if there are any review sources for this business
    const { data: sourcesData } = await supabase
      .from('review_sources')
      .select('*')
      .eq('business_id', targetBusinessId);
    console.log('Review sources found:', sourcesData?.length || 0, sourcesData);

    console.log('Executing reviews query with business_id:', targetBusinessId);
    console.log('Query filter:', targetBusinessId ? `business_id = ${targetBusinessId}` : `created_by = ${user.email}`);
    const { data, error } = await query;
    console.log('Query result:', { dataCount: data?.length, error });
    if (data && data.length > 0) {
      console.log('Sample review:', { id: data[0].id, business_id: data[0].business_id, reviewer_name: data[0].reviewer_name });
    }

    if (error) throw error;

    // Check if there are more reviews by counting total reviews
    let totalCountQuery = supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true });

    if (targetBusinessId) {
      totalCountQuery = totalCountQuery.eq('business_id', targetBusinessId);
    } else {
      totalCountQuery = totalCountQuery.eq('created_by', user.email);
    }

    const { count: totalCount } = await totalCountQuery;

    res.json({
      success: true,
      reviews: data || [],
      has_more: data && data.length >= parseInt(limit) && totalCount > data.length,
      total_count: totalCount || 0
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Private Feedback API endpoints
app.post('/api/private-feedback', async (req, res) => {
  try {
    const { review_request_id, sentiment, rating, message, category } = req.body;
    
    console.log('=== PRIVATE FEEDBACK API DEBUG ===');
    console.log('Request body:', { review_request_id, sentiment, rating, message, category });
    
    // For public feedback collection, we don't require authentication
    // The review_request_id provides the security context

    // Validate required fields
    if (!review_request_id || !sentiment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create private feedback record
    const { data: feedback, error } = await supabase
      .from('private_feedback')
      .insert({
        review_request_id,
        sentiment,
        rating: rating || null,
        message: message || null,
        category: category || 'general_experience'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating private feedback:', error);
      throw error;
    }

    // Log telemetry event (if available)
    try {
      // Get business_id from review_request for telemetry
      const { data: reviewRequest } = await supabase
        .from('review_requests')
        .select('business_id')
        .eq('id', review_request_id)
        .single();
        
      if (reviewRequest?.business_id) {
        await supabase.rpc('log_telemetry_event', {
          p_business_id: reviewRequest.business_id,
          p_event_type: 'private_feedback_submitted',
          p_event_data: {
            feedback_id: feedback.id,
            sentiment,
            rating,
            has_message: !!message
          }
        });
      }
    } catch (telemetryError) {
      console.warn('Telemetry logging failed:', telemetryError);
      // Don't fail the main operation if telemetry fails
    }

    res.json({
      success: true,
      feedback,
      message: 'Private feedback submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting private feedback:', error);
    res.status(500).json({ error: 'Failed to submit private feedback' });
  }
});

// Get private feedback for a business
app.get('/api/private-feedback', async (req, res) => {
  try {
    const { business_id, limit = 50, offset = 0 } = req.query;
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization?.replace('Bearer ', ''));
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's business_id if not provided
    let targetBusinessId = business_id;
    if (!targetBusinessId) {
      let { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('user_id', user.id)
        .single();
      
      if (profile?.business_id) {
        targetBusinessId = profile.business_id;
      } else {
        // If no business_id, create one
        const userEmail = user.email || user.user_metadata?.email || user.user_metadata?.full_name || 'unknown@example.com';
        const { data: created, error: createErr } = await supabase
          .from('businesses')
          .insert({ 
            name: 'My Business', 
            website: null,
            created_by: userEmail
          })
          .select('id')
          .single();
        if (createErr) return res.status(403).json({ error: 'RLS prevented creating business', details: createErr });
        targetBusinessId = created.id;
        await supabase.from('profiles').update({ business_id: targetBusinessId }).eq('user_id', user.id);
      }
    }

    if (!targetBusinessId) {
      return res.status(400).json({ error: 'Business ID required' });
    }

    // Get private feedback with related data
    const { data: feedback, error } = await supabase
      .from('private_feedback')
      .select(`
        *,
        review_requests!inner(
          id,
          customer_id,
          business_id,
          customers!inner(id, full_name, email)
        )
      `)
      .eq('review_requests.business_id', targetBusinessId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching private feedback:', error);
      throw error;
    }

    res.json({
      success: true,
      feedback: feedback || [],
      count: feedback?.length || 0
    });

  } catch (error) {
    console.error('Error fetching private feedback:', error);
    res.status(500).json({ error: 'Failed to fetch private feedback' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});