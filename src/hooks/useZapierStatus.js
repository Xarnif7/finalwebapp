import { useState, useEffect } from 'react';
import { useAuth } from '../components/auth/AuthProvider';
import { supabase } from '../lib/supabase';

export const useZapierStatus = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkZapierConnection = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setIsConnected(false);
        setLoading(false);
        return;
      }

      // Get business ID from user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.business_id) {
        console.log('[ZAPIER_STATUS] No business found for user');
        setIsConnected(false);
        setLoading(false);
        return;
      }

      // Check if business has customers from Zapier
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, source')
        .eq('business_id', profile.business_id)
        .eq('source', 'zapier')
        .limit(1);

      console.log('[ZAPIER_STATUS] Checking for Zapier customers:', {
        businessId: profile.business_id,
        customersCount: customers?.length || 0,
        error: customersError
      });

      if (customersError) {
        throw customersError;
      }

      const hasZapierCustomers = customers && customers.length > 0;
      console.log('[ZAPIER_STATUS] Has Zapier customers:', hasZapierCustomers);
      
      setIsConnected(hasZapierCustomers);
    } catch (err) {
      console.error('Error checking Zapier connection:', err);
      setError(err.message);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkZapierConnection();
  }, [user]);

  return {
    isConnected,
    loading,
    error,
    refetch: checkZapierConnection
  };
};
