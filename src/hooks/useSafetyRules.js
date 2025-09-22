import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useSafetyRules = () => {
  const [safetyRules, setSafetyRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSafetyRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch('/api/safety-rules', {
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
        setSafetyRules(result.safetyRules);
      } else {
        throw new Error(result.error || 'Failed to fetch safety rules');
      }
    } catch (err) {
      console.error('Error fetching safety rules:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSafetyRules();
  }, [fetchSafetyRules]);

  return {
    safetyRules,
    loading,
    error,
    refetch: fetchSafetyRules
  };
};
