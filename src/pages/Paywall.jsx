import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useSubscriptionStatus } from "../hooks/useSubscriptionStatus";
import { supabase } from "../lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { CheckCircle, Star, Zap, Crown } from "lucide-react";
import { apiClient } from "../lib/apiClient";

export default function Paywall() {
  const navigate = useNavigate();
  const { user, loading, handleAuth } = useAuth();
  const { active: hasSubscription, loading: subLoading } = useSubscriptionStatus();
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

  // Show loading spinner only briefly while checking auth/subscription status
  if (loading || (subLoading && !showPaywall)) {
    console.log('[PAYWALL] Still loading:', { loading, subLoading, showPaywall });
    return null; // No loading indicator to prevent flash
  }

  // Don't render if user is not authenticated
  if (!user) {
    console.log('[PAYWALL] Not rendering - no user');
    return null; // No loading spinner to eliminate blue bar flash
  }

  // If user has subscription but we're still checking onboarding, show loading
  if (hasSubscription && onboardingCompleted === null) {
    return null; // No loading spinner to eliminate blue bar flash
  }

  console.log('[PAYWALL] Rendering paywall component');

  const startCheckout = async (planTier) => {
    setCheckoutLoading(true);
    
    try {
      console.log('[PAYWALL] Starting checkout for plan:', planTier);
      
      // Remove timeout to make checkout instant
      const response = await apiClient.post('/api/stripe/checkout', { planTier });

      const { url } = response;
      console.log('[PAYWALL] Got checkout URL:', url);
      
      if (url) {
        // Instant redirect to Stripe
        window.location.href = url;
      } else {
        throw new Error('no_checkout_url');
      }
      
    } catch (error) {
      console.error('[PAYWALL] Checkout failed:', error);
      
      if (error.message === 'AUTH_REQUIRED') {
        console.log('[PAYWALL] Auth required, triggering OAuth');
        await handleAuth('/paywall');
        return;
      } else if (error.message === 'network_error') {
        alert('Network error. Please check your connection and try again.');
      } else {
        alert('Failed to initiate checkout. Please try again or contact support.');
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
