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
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Validate Zapier token
  const zapierToken = req.headers['x-zapier-token'];
  if (!zapierToken || zapierToken !== process.env.ZAPIER_TOKEN) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  // Return success
  return res.status(200).json({ ok: true });
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

    return res.status(200).json({
      businesses: businesses,
      customersByBusiness: customersByBusiness,
      totalCustomers: customers.length,
      totalBusinesses: businesses.length,
      yourBusinessId: businesses[0]?.id
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/zapier/upsert-customer', async (req, res) => {
  try {
    // Validate Zapier token (check both header and URL param)
    const zapierToken = req.headers['x-zapier-token'] || req.query.zapier_token;
    if (!zapierToken || zapierToken !== process.env.ZAPIER_TOKEN) {
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

    // Check for business_id in headers (X-Blipp-Business)
    const businessId = req.headers['x-blipp-business'];
    
    let business;
    if (businessId) {
      // Use the specific business_id from headers
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
      console.log('[ZAPIER] Using specified business:', { id: business.id, name: business.name });
    } else {
      // Fallback: Get the first available business (for backward compatibility)
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

    // First check if customer already exists
    let existingCustomer = null;
    if (customerData.email) {
      const { data: existing, error: existingError } = await supabase
        .from('customers')
        .select('id, full_name, email, phone')
        .eq('business_id', customerData.business_id)
        .eq('email', customerData.email)
        .single();
      
      if (!existingError && existing) {
        existingCustomer = existing;
      }
    }

    let customer;
    if (existingCustomer) {
      // Update existing customer
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({
          full_name: customerData.full_name,
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
          created_by: 'system'
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
            const delayHours = template.config_json?.delay_hours || 24;
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

    const kpis = {
      active_sequences_count: activeSequencesCount,
      send_success_pct: sendSuccessRate,
      failure_rate_pct: failureRate,
      messages_sent: messagesSent,
      messages_skipped: messagesSkipped,
      total_recipients: totalRecipients,
      hasData: totalAttempts > 0
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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
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

// Get single sequence with steps
app.get('/api/sequences/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
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

// Test send message
app.post('/api/sequences/:id/test-send', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    // Get user's business
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
});
