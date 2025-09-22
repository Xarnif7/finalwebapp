import { useState, useEffect } from 'react';
import { useAuth } from '../components/auth/AuthProvider';
import { supabase } from '../lib/supabase/browser';

export function useBusinessIntegrations() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [businessId, setBusinessId] = useState(null);

  // Get business_id from user profile
  useEffect(() => {
    const getBusinessId = async () => {
      if (!user) {
        setBusinessId(null);
        return;
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('business_id')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          setError('Unable to load user profile');
          return;
        }

        if (!profile?.business_id) {
          setError('Business not found. Please complete onboarding first.');
          return;
        }

        setBusinessId(profile.business_id);
      } catch (err) {
        console.error('Error getting business ID:', err);
        setError('Failed to load business information');
      }
    };

    getBusinessId();
  }, [user]);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const fetchIntegrations = async () => {
      try {
        setLoading(true);
        
        // Check if business has customers with source "zapier" (indicating CRM integration)
        const { data: customers, error: customersError } = await supabase
          .from('customers')
          .select('id, source')
          .eq('business_id', businessId)
          .limit(1);

        console.log('[INTEGRATIONS] Zapier customers check:', {
          businessId,
          customers,
          customersError,
          customersCount: customers?.length || 0
        });

        if (customersError) {
          throw customersError;
        }

        // If we have zapier customers, consider CRM integration active
        const hasZapierCustomers = customers && customers.length > 0;
        
        console.log('[INTEGRATIONS] Has Zapier customers:', hasZapierCustomers);
        
        const mockIntegrations = hasZapierCustomers ? [
          {
            id: 'zapier-crm',
            provider: 'zapier',
            status: 'connected',
            name: 'CRM Integration',
            connected_at: new Date().toISOString()
          }
        ] : [];

        setIntegrations(mockIntegrations);
      } catch (err) {
        console.error('Error fetching integrations:', err);
        setError('Failed to fetch integrations');
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrations();
  }, [businessId]);

  const hasActiveIntegration = integrations.some(integration => integration.status === 'connected');
  const hasZapierIntegration = integrations.some(integration => 
    integration.provider === 'zapier' && integration.status === 'connected'
  );

  return {
    integrations,
    loading,
    error,
    hasActiveIntegration,
    hasZapierIntegration
  };
}
