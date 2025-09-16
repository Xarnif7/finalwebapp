import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the JWT token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log('[CHECKOUT] Creating session for user:', user.id);

    // Find or create Stripe customer
    let stripeCustomerId;
    
    // First, try to find existing customer in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    if (profile?.stripe_customer_id) {
      stripeCustomerId = profile.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          supabase_user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      // Store the customer ID in the profile
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          stripe_customer_id: stripeCustomerId,
          email: user.email,
          updated_at: new Date().toISOString(),
        });

      if (updateError) {
        console.error('Error updating profile with Stripe customer ID:', updateError);
        // Don't fail the checkout, just log the error
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://myblipp.com'}/auth/callback?from=checkout_success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://myblipp.com'}/pricing`,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          supabase_user_id: user.id,
        },
      },
    });

    console.log('[CHECKOUT] Created session:', session.id, 'for user:', user.id);

    return res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('[CHECKOUT] Error creating session:', error);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
}
