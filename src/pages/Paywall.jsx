import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/auth/AuthProvider";
import { useSubscriptionStatus } from "../hooks/useSubscriptionStatus";
import { supabase } from "../lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { CheckCircle, Star, Zap, Crown } from "lucide-react";
import { apiClient } from "../lib/apiClient";

export default function Paywall() {
  const navigate = useNavigate();
  const { user, status: authStatus } = useAuth();
  const { active: hasSubscription, loading: subLoading } = useSubscriptionStatus();
  const loading = authStatus === 'loading';
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);

  console.log('[PAYWALL] Component rendering with state:', { 
    user: !!user, 
    loading, 
    hasSubscription, 
    subLoading,
    checkoutLoading 
  });

  // Pricing page guards - require authentication
  useEffect(() => {
    if (loading || subLoading) {
      // Still loading auth state, show skeleton
      return;
    }

    if (authStatus === 'signedOut') {
      // Not signed in, trigger Google OAuth directly
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account', include_granted_scopes: 'true' }
        }
      });
      return;
    }

    if (authStatus === 'signedIn' && hasSubscription) {
      // Already subscribed, redirect to dashboard
      navigate('/dashboard', { replace: true });
      return;
    }

    // Signed in but no active subscription - show pricing
    setShowPaywall(true);
  }, [authStatus, hasSubscription, loading, subLoading, navigate]);

  // Note: Do not return early before hooks. Rendering guards are handled below after hooks.

  // Timeout mechanism to show paywall even if subscription check is slow
  useEffect(() => {
    if (loading) return; // Wait for auth to be ready
    
    const timeoutId = setTimeout(() => {
      console.log('[PAYWALL] Timeout reached, showing paywall regardless of subscription status');
      setShowPaywall(true);
    }, 3000); // 3 second timeout

    return () => clearTimeout(timeoutId);
  }, [loading]);

  // Fallback: if subscription check fails or times out, show paywall anyway
  useEffect(() => {
    if (!loading && !subLoading && !hasSubscription) {
      console.log('[PAYWALL] Subscription check completed, showing paywall');
      setShowPaywall(true);
    }
  }, [loading, subLoading, hasSubscription]);

  // Check onboarding completion status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user && hasSubscription) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single();
          
          if (!error && data) {
            setOnboardingCompleted(data.onboarding_completed);
          }
        } catch (err) {
          console.error('[PAYWALL] Error checking onboarding status:', err);
        }
      }
    };

    checkOnboardingStatus();
  }, [user, hasSubscription]);

  // Debug logging
  useEffect(() => {
    console.log('[PAYWALL] Component mounted');
    console.log('[PAYWALL] Auth state:', { user: !!user, loading, hasSubscription, subLoading });
  }, [user, loading, hasSubscription, subLoading]);

  // Redirect if not authenticated or already has subscription
  useEffect(() => {
    console.log('[PAYWALL] Checking redirects:', { user: !!user, loading, hasSubscription, subLoading, onboardingCompleted });
    
    if (!loading && !user) {
      console.log('[PAYWALL] No user, redirecting to home');
      navigate("/", { replace: true });
      return;
    }
    
    // Only redirect if we have a definitive subscription status and it's active
    if (!subLoading && hasSubscription) {
      console.log('[PAYWALL] User has subscription, checking onboarding status:', onboardingCompleted);
      if (onboardingCompleted === true) {
        console.log('[PAYWALL] Onboarding completed, redirecting to dashboard');
        navigate("/reporting", { replace: true });
      } else if (onboardingCompleted === false) {
        console.log('[PAYWALL] Onboarding not completed, redirecting to onboarding');
        navigate("/onboarding", { replace: true });
      }
      // If onboardingCompleted is null, wait for it to be determined
      return;
    }
  }, [user, loading, hasSubscription, subLoading, onboardingCompleted, navigate]);

  // Rendering guards (safe here because all hooks above have executed)
  if (loading || (subLoading && !showPaywall)) {
    console.log('[PAYWALL] Still loading:', { loading, subLoading, showPaywall });
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="h-12 w-96 bg-gray-200 rounded-lg animate-pulse mx-auto mb-6" />
            <div className="h-6 w-64 bg-gray-200 rounded animate-pulse mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-xl">
                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="h-12 w-24 bg-gray-200 rounded animate-pulse mb-6" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
                <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse mt-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!showPaywall) {
    return null;
  }

  if (!user) {
    console.log('[PAYWALL] Not rendering - no user');
    return null;
  }

  if (hasSubscription && onboardingCompleted === null) {
    return null;
  }

  console.log('[PAYWALL] Rendering paywall component');

  const startCheckout = async (planTier) => {
    if (!user) {
      // Not signed in → trigger Google OAuth
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account', include_granted_scopes: 'true' }
        }
      });
      return;
    }

    setCheckoutLoading(true);
    
    try {
      console.log('[PAYWALL] Starting checkout for plan:', planTier);
      
      // Get the current session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No valid session found');
      }

      // Map planTier to priceId (you'll need to update this based on your actual Stripe price IDs)
      const priceIdMap = {
        'starter': process.env.VITE_STRIPE_STARTER_PRICE_ID || 'price_starter',
        'pro': process.env.VITE_STRIPE_PRO_PRICE_ID || 'price_pro',
        'enterprise': process.env.VITE_STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
      };

      const priceId = priceIdMap[planTier];
      if (!priceId) {
        throw new Error(`Invalid plan tier: ${planTier}`);
      }

      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      console.log('[PAYWALL] Got checkout URL:', url);
      
      if (url) {
        // Instant redirect to Stripe
        window.location.href = url;
      } else {
        throw new Error('no_checkout_url');
      }
      
    } catch (error) {
      console.error('[PAYWALL] Checkout failed:', error);
      
      if (error.message === 'network_error') {
        alert('Network error. Please check your connection and try again.');
      } else {
        alert(`Failed to initiate checkout: ${error.message}`);
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  const plans = [
    {
      id: 'basic',
      name: 'Standard',
      price: '$49.99',
      period: '/ month',
      description: 'Perfect for small businesses getting started',
      features: [
        'Up to 100 review requests per month',
        'Basic automation templates',
        'Email support',
        'Google My Business integration',
        'Basic analytics dashboard'
      ],
      icon: Star,
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$89.99',
      period: '/ month',
      description: 'Ideal for growing businesses with more needs',
      features: [
        'Up to 500 review requests per month',
        'Advanced automation sequences',
        'Priority email support',
        'Multi-platform integration',
        'Advanced analytics & reporting',
        'Team collaboration tools',
        'Custom branding'
      ],
      icon: Zap,
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$179.99',
      period: '/ month',
      description: 'For large businesses with complex requirements',
      features: [
        'Unlimited review requests',
        'Custom automation workflows',
        'Dedicated account manager',
        'Full platform integration',
        'Advanced analytics & insights',
        'Multi-team management',
        'Custom integrations',
        'White-label options',
        '24/7 phone support'
      ],
      icon: Crown,
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Choose Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Plan</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start growing your reputation today. Choose the plan that fits your business needs.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-xl border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${
                plan.popular 
                  ? 'border-purple-500 shadow-purple-100' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500' 
                      : 'bg-gradient-to-r from-blue-500 to-blue-600'
                  }`}>
                    <plan.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-1">{plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => startCheckout(plan.id)}
                  disabled={checkoutLoading}
                  className={`w-full py-4 text-lg font-semibold ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                  }`}
                >
                  {checkoutLoading ? 'Processing...' : 'Choose Plan'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600">
          <p className="mb-4">
            All plans include a 14-day free trial. Cancel anytime.
          </p>
          <p className="text-sm">
            Need a custom plan? <button className="text-blue-600 hover:text-blue-700 underline">Contact us</button>
          </p>
        </div>
      </div>
    </div>
  );
}
