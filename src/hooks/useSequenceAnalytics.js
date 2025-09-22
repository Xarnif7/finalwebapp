import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useSequenceAnalytics = (sequenceId) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    if (!sequenceId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`/api/sequences/${sequenceId}/analytics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.ok) {
        setAnalytics(result.analytics);
      } else {
        throw new Error(result.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('Error fetching sequence analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sequenceId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics
  };
};
