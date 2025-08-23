import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

export const config = { api: { bodyParser: false } };

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Stripe-Signature');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Content-Type', 'application/json');
}

export default async function handler(req, res) {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      setCorsHeaders(req, res);
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      setCorsHeaders(req, res);
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('[WEBHOOK] Signature verification failed:', err.message);
      setCorsHeaders(req, res);
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Invalid signature' }));
      return;
    }

    console.log('[WEBHOOK] Received event:', event.type);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object);
          break;
        default:
          console.log('[WEBHOOK] Unhandled event type:', event.type);
      }

      setCorsHeaders(req, res);
      res.statusCode = 200;
      res.end(JSON.stringify({ received: true }));
    } catch (error) {
      console.error('[WEBHOOK] Error processing event:', error);
      setCorsHeaders(req, res);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Webhook processing failed' }));
    }
  } catch (error) {
    console.error('[WEBHOOK] Unhandled error:', error);
    setCorsHeaders(req, res);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

async function handleCheckoutCompleted(session) {
  console.log('[WEBHOOK] Processing checkout completed:', session.id);
  
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: session.metadata.user_id,
      stripe_subscription_id: session.subscription,
      plan_tier: session.metadata.plan_tier,
      status: 'active',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('[WEBHOOK] Error upserting subscription:', error);
    throw error;
  }

  console.log('[WEBHOOK] Subscription upserted successfully');
}

async function handlePaymentSucceeded(invoice) {
  console.log('[WEBHOOK] Processing payment succeeded:', invoice.id);
  
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_end: new Date(invoice.period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', invoice.subscription);

  if (error) {
    console.error('[WEBHOOK] Error updating subscription:', error);
    throw error;
  }

  console.log('[WEBHOOK] Subscription updated successfully');
}

async function handleSubscriptionUpdated(subscription) {
  console.log('[WEBHOOK] Processing subscription updated:', subscription.id);
  
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('[WEBHOOK] Error updating subscription:', error);
    throw error;
  }

  console.log('[WEBHOOK] Subscription updated successfully');
}

async function handleSubscriptionDeleted(subscription) {
  console.log('[WEBHOOK] Processing subscription deleted:', subscription.id);
  
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('[WEBHOOK] Error updating subscription:', error);
    throw error;
  }

  console.log('[WEBHOOK] Subscription marked as canceled');
}
