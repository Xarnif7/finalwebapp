import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../components/auth/AuthProvider';

export function useAutomationMetrics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    sends: 0,
    failures: 0,
    failureRate: 0,
    threshold: 10,
    hasAlert: false,
    alertMessage: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = useCallback(async () => {
    if (!user) {
      setMetrics({
        sends: 0,
        failures: 0,
        failureRate: 0,
        threshold: 10,
        hasAlert: false,
        alertMessage: null
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch('/api/automation-metrics', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data.metrics || {
        sends: 0,
        failures: 0,
        failureRate: 0,
        threshold: 10,
        hasAlert: false,
        alertMessage: null
      });
    } catch (err) {
      console.error('Error fetching automation metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMetrics();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics,
  };
}
