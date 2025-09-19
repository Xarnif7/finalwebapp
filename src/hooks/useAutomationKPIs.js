import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../components/auth/AuthProvider';
import { toast } from 'sonner';

export function useAutomationKPIs() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState({
    activeSequences: 0,
    customersInSequences: 0,
    conversionRate7d: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchKPIs = useCallback(async () => {
    if (!user) {
      setKpis({
        activeSequences: 0,
        customersInSequences: 0,
        conversionRate7d: 0
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

      const response = await fetch('/api/automation-kpis', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch KPIs');
      }

      const data = await response.json();
      setKpis(data.kpis || {
        activeSequences: 0,
        customersInSequences: 0,
        conversionRate7d: 0
      });
    } catch (err) {
      console.error('Error fetching automation KPIs:', err);
      setError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  return {
    kpis,
    loading,
    error,
    refetch: fetchKPIs,
  };
}
