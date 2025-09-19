import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../components/auth/AuthProvider';
import { toast } from 'sonner';

export function useTriggersData() {
  const { user } = useAuth();
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTriggers = useCallback(async () => {
    if (!user) {
      setTriggers([]);
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

      // Fetch trigger data from automation_logs
      const response = await fetch('/api/triggers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch triggers');
      }

      const data = await response.json();
      setTriggers(data.triggers || []);
    } catch (err) {
      console.error('Error fetching triggers:', err);
      setError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTriggers();
  }, [fetchTriggers]);

  return {
    triggers,
    loading,
    error,
    refetch: fetchTriggers,
  };
}
