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
    const subscription = (subscriptions || []).find((s) => {
      if (!s) return false;
      const statusOk = ['active', 'trialing', 'past_due'].includes(s.status);
      const endOk = s.current_period_end ? s.current_period_end > nowIso : false;
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

app.post('/api/zapier/upsert-customer', async (req, res) => {
  try {
    // Validate Zapier token
    const zapierToken = req.headers['x-zapier-token'];
    if (!zapierToken || zapierToken !== process.env.ZAPIER_TOKEN) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Parse and validate payload
    const { email, phone, first_name, last_name, external_id, tags, source, event_ts } = req.body;
    
    if (!email && !phone) {
      return res.status(400).json({ ok: false, error: 'Either email or phone is required' });
    }

    if (!first_name || !last_name) {
      return res.status(400).json({ ok: false, error: 'First name and last name are required' });
    }

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

    // Get or create business
    let { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .limit(1)
      .single();

    if (businessError && businessError.code === 'PGRST116') {
      // Create default business if none exists
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

    // Prepare customer data for upsert
    const customerData = {
      business_id: business.id,
      full_name: `${first_name} ${last_name}`,
      email: email?.toLowerCase().trim() || null,
      phone: phone?.replace(/\D/g, '') || null, // digits only
      notes: external_id ? `External ID: ${external_id}` : null,
      tags: tags || [],
      status: 'active',
      service_date: event_ts ? new Date(event_ts).toISOString().split('T')[0] : null,
      created_by: 'zapier'
    };

    // Upsert customer
    const { data: customer, error: upsertError } = await supabase
      .from('customers')
      .upsert(customerData, {
        onConflict: 'business_id,email,phone',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (upsertError) {
      console.error('[ZAPIER] Customer upsert error:', upsertError);
      return res.status(500).json({ ok: false, error: 'Failed to upsert customer' });
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
          payload_hash: require('crypto').createHash('sha256').update(JSON.stringify(req.body)).digest('hex'),
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
      business_id: business.id
    });

    return res.status(200).json({ 
      ok: true, 
      customer_id: customer.id,
      business_id: business.id
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
  
  if (ratePerHour && hourCount >= ratePerHour) {
    return { allowed: false, reason: 'hourly_rate_limit', current: hourCount, limit: ratePerHour };
  }
  
  if (ratePerDay && dayCount >= ratePerDay) {
    return { allowed: false, reason: 'daily_rate_limit', current: dayCount, limit: ratePerDay };
  }
  
  return { allowed: true };
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

// Helper function to check if customer can receive messages
async function canSendToCustomer(customerId, businessId) {
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('unsubscribed, dnc, hard_bounced, last_review_request_at')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single();

    if (error || !customer) {
      console.log('[SAFETY] Customer not found:', customerId);
      return { canSend: false, reason: 'Customer not found' };
    }

    // Check if customer is unsubscribed
    if (customer.unsubscribed) {
      console.log('[SAFETY] Customer unsubscribed:', customerId);
      return { canSend: false, reason: 'Customer unsubscribed' };
    }

    // Check if customer is on DNC list
    if (customer.dnc) {
      console.log('[SAFETY] Customer on DNC list:', customerId);
      return { canSend: false, reason: 'Customer on DNC list' };
    }

    // Check if customer has hard bounced
    if (customer.hard_bounced) {
      console.log('[SAFETY] Customer hard bounced:', customerId);
      return { canSend: false, reason: 'Customer hard bounced' };
    }

    // Check cooldown period
    const cooldownDays = parseInt(process.env.COOLDOWN_DAYS || '7');
    if (customer.last_review_request_at) {
      const lastRequest = new Date(customer.last_review_request_at);
      const now = new Date();
      const daysSinceLastRequest = (now - lastRequest) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastRequest < cooldownDays) {
        console.log('[SAFETY] Customer in cooldown period:', customerId, 'days since last request:', daysSinceLastRequest);
        return { canSend: false, reason: `Customer in cooldown period (${Math.ceil(cooldownDays - daysSinceLastRequest)} days remaining)` };
      }
    }

    return { canSend: true };
  } catch (error) {
    console.error('[SAFETY] Error checking customer safety:', error);
    return { canSend: false, reason: 'Error checking customer status' };
  }
}

// Send message helper with provider adapters
async function sendMessage(messageData, dryRun = false) {
  try {
    // Check if customer can receive messages (only if customer_id is provided)
    if (messageData.customer_id && messageData.business_id) {
      const safetyCheck = await canSendToCustomer(messageData.customer_id, messageData.business_id);
      if (!safetyCheck.canSend) {
        console.log('[SAFETY] Blocked message send:', safetyCheck.reason);
        return { success: false, blocked: true, reason: safetyCheck.reason };
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

// Calculate next allowed time considering quiet hours and timezone
function nextAllowedTime(now, quietHoursStart, quietHoursEnd, timezone = 'UTC') {
  const currentTime = new Date(now);
  
  // If no quiet hours configured, return current time
  if (!quietHoursStart || !quietHoursEnd) {
    return currentTime;
  }

  // Parse quiet hours
  const [startHour, startMin] = quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = quietHoursEnd.split(':').map(Number);
  
  // Create today's quiet hours boundaries
  const todayStart = new Date(currentTime);
  todayStart.setHours(startHour, startMin, 0, 0);
  
  const todayEnd = new Date(currentTime);
  todayEnd.setHours(endHour, endMin, 0, 0);
  
  // Handle case where quiet hours span midnight (e.g., 22:00 to 08:00)
  if (todayStart > todayEnd) {
    // Quiet hours span midnight
    if (currentTime >= todayStart || currentTime <= todayEnd) {
      // Currently in quiet hours, return end of quiet hours
      return todayEnd;
    } else {
      // Not in quiet hours, return current time
      return currentTime;
    }
  } else {
    // Quiet hours within same day
    if (currentTime >= todayStart && currentTime <= todayEnd) {
      // Currently in quiet hours, return end of quiet hours
      return todayEnd;
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

// Log automation event
async function logAutomationEvent(businessId, level, source, message, data = {}) {
  try {
    await supabase
      .from('automation_logs')
      .insert({
        business_id: businessId,
        level,
        source,
        message,
        data,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log automation event:', error);
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

      console.log(`[PROCESS] Message blocked for enrollment ${enrollment.id}: ${sendResult.reason}. Enrollment stopped.`);
      
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
          reason: sendResult.reason
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
      .select('event_type, created_at')
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
          first_name,
          last_name,
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
      customer_name: log.customers ? `${log.customers.first_name} ${log.customers.last_name}` : 'Unknown Customer',
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
      .eq('event_type', 'message_sent')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (requestsError) {
      console.error('[AUTOMATION_KPIS] Error fetching review requests:', requestsError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch review requests' });
    }

    // Count reviews left in last 7 days (customers with review_left = true)
    const { data: reviewsLeft, error: reviewsError } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', profile.business_id)
      .eq('review_left', true)
      .gte('updated_at', sevenDaysAgo.toISOString());

    if (reviewsError) {
      console.error('[AUTOMATION_KPIS] Error fetching reviews left:', reviewsError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch reviews left' });
    }

    // Calculate conversion rate
    const conversionRate = reviewRequests.length > 0 
      ? Math.round((reviewsLeft.length / reviewRequests.length) * 100)
      : 0;

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
});
