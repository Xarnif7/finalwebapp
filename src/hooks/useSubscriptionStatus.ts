import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';

interface SubscriptionState {
  hasActive: boolean;
  loading: boolean;
  error: string | null;
  plan?: string | null;
  status?: string | null;
  subscription?: any;
}

export function useSubscriptionStatus(): SubscriptionState {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('[SUBSCRIPTION] Fetching subscription status...');
        const response = await apiClient.get('/api/subscription/status');
        
        console.log('[SUBSCRIPTION] API response:', response);
        
        if (response && typeof response === 'object') {
          setSubscription(response);
        } else {
          console.warn('[SUBSCRIPTION] Unexpected response format:', response);
          setSubscription(null);
        }
      } catch (err: any) {
        console.error('[SUBSCRIPTION] Error fetching subscription status:', err);
        setError(err?.message || 'Failed to fetch subscription status');
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionStatus();
  }, []);

  const result = useMemo((): SubscriptionState => {
    if (loading) {
      return {
        hasActive: false,
        loading: true,
        error: null
      };
    }

    if (error) {
      return {
        hasActive: false,
        loading: false,
        error
      };
    }

    if (!subscription) {
      return {
        hasActive: false,
        loading: false,
        error: null
      };
    }

    // Map API response to our expected format
    const hasActive = subscription.active === true;
    const plan = subscription.plan_tier || null;
    const status = subscription.status || null;

    console.log('[SUBSCRIPTION] Processed result:', {
      hasActive,
      plan,
      status,
      subscription
    });

    return {
      hasActive,
      loading: false,
      error: null,
      plan,
      status,
      subscription
    };
  }, [subscription, loading, error]);

  return result;
}
}