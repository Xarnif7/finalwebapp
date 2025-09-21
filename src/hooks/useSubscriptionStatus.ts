import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { apiClient } from '@/lib/apiClient';

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

        console.log('[useSubscriptionStatus] Fetching subscription status...');
        
        // Use the API endpoint that we know is working correctly
        const response = await apiClient.get('/api/subscription/status');
        
        console.log('[useSubscriptionStatus] API response:', response);
        
        if (response.active) {
          console.log('[useSubscriptionStatus] Setting active subscription:', response);
          setSubscription({
            status: response.status,
            plan: response.plan_tier,
            hasActive: response.active
          });
        } else {
          console.log('[useSubscriptionStatus] No active subscription found');
          setSubscription(null);
        }
      } catch (err) {
        console.error('[useSubscriptionStatus] Error fetching subscription:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user, authStatus]);

  const result = useMemo((): SubscriptionState => {
    console.log('[useSubscriptionStatus] Computing result:', { loading, subscription, error });
    
    if (loading) {
      return {
        subStatus: 'none',
        hasActive: false,
        loading: true
      };
    }

    if (!subscription) {
      console.log('[useSubscriptionStatus] No subscription, returning none');
      return {
        subStatus: 'none',
        hasActive: false,
        loading: false,
        error
      };
    }

    const subStatus = normalizeSubscriptionStatus(subscription.status);
    const hasActive = ['active', 'trialing'].includes(subStatus);

    console.log('[useSubscriptionStatus] Final result:', { subStatus, hasActive, plan: subscription.plan });

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