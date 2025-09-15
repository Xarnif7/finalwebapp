import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

export type SubscriptionStatus = 
  | 'none' 
  | 'active' 
  | 'trialing' 
  | 'past_due' 
  | 'canceled' 
  | 'incomplete' 
  | 'incomplete_expired';

export interface SubscriptionState {
  subStatus: SubscriptionStatus;
  plan?: string;
  hasActive: boolean;
  loading: boolean;
  error?: string;
}

// Normalize Stripe subscription status to our canonical states
function normalizeSubscriptionStatus(stripeStatus: string | null): SubscriptionStatus {
  if (!stripeStatus) return 'none';
  
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return stripeStatus;
    case 'past_due':
    case 'canceled':
    case 'incomplete':
    case 'incomplete_expired':
      return stripeStatus;
    default:
      console.warn('[useSubscriptionStatus] Unknown Stripe status:', stripeStatus);
      return 'none';
  }
}

export function useSubscriptionStatus(): SubscriptionState {
  const { user, status: authStatus } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (authStatus === 'loading') {
      setLoading(true);
      return;
    }

    if (authStatus === 'signedOut') {
      setSubscription(null);
      setLoading(false);
      setError(undefined);
      return;
    }

    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        setLoading(true);
        setError(undefined);

        // Check for active subscription in subscriptions table
        const { data: subscriptions, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('deleted', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (subError) {
          console.error('[useSubscriptionStatus] Error fetching subscriptions:', subError);
          setError(subError.message);
          setSubscription(null);
          return;
        }

        // If no subscriptions found, also check profiles table for legacy data
        if (!subscriptions || subscriptions.length === 0) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('subscription_status, plan_name')
            .eq('id', user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') { // Not found is OK
            console.error('[useSubscriptionStatus] Error fetching profile:', profileError);
            setError(profileError.message);
          }

          if (profile) {
            setSubscription({
              status: profile.subscription_status,
              plan: profile.plan_name,
              // Legacy: treat any profile with subscription_status as active
              hasActive: !!profile.subscription_status && profile.subscription_status !== 'none'
            });
          } else {
            setSubscription(null);
          }
        } else {
          // Use the latest subscription
          const latestSub = subscriptions[0];
          setSubscription({
            status: latestSub.status,
            plan: latestSub.plan_name || latestSub.plan_id,
            hasActive: ['active', 'trialing'].includes(latestSub.status)
          });
        }
      } catch (err) {
        console.error('[useSubscriptionStatus] Unexpected error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user, authStatus]);

  const result = useMemo((): SubscriptionState => {
    if (loading) {
      return {
        subStatus: 'none',
        hasActive: false,
        loading: true
      };
    }

    if (!subscription) {
      return {
        subStatus: 'none',
        hasActive: false,
        loading: false,
        error
      };
    }

    const subStatus = normalizeSubscriptionStatus(subscription.status);
    const hasActive = ['active', 'trialing'].includes(subStatus);

    return {
      subStatus,
      plan: subscription.plan,
      hasActive,
      loading: false,
      error
    };
  }, [subscription, loading, error]);

  return result;
}
