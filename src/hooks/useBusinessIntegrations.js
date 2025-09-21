import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';

export function useBusinessIntegrations(businessId) {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const fetchIntegrations = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/api/business-integrations?business_id=${businessId}`);
        
        if (response.success) {
          setIntegrations(response.data || []);
        } else {
          setError(response.error || 'Failed to fetch integrations');
        }
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
