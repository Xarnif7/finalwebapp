import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';

export const useAutomationKPIs = (businessId) => {
  const [kpis, setKpis] = useState({
    activeSequences: 0,
    sendSuccessRate: 0,
    failureRate: 0,
    totalRecipients: 0,
    totalSends: 0,
    successfulSends: 0,
    failedSends: 0,
    hasData: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchKPIs = async () => {
    if (!businessId) {
      setKpis({
        activeSequences: 0,
        sendSuccessRate: 0,
        failureRate: 0,
        totalRecipients: 0,
        totalSends: 0,
        successfulSends: 0,
        failedSends: 0,
        hasData: false
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/api/automation/kpis/${businessId}`);
      
      if (response.success) {
        setKpis(response.kpis);
      } else {
        setError('Failed to fetch automation KPIs');
      }
    } catch (err) {
      console.error('Error fetching automation KPIs:', err);
      setError('Failed to fetch automation KPIs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, [businessId]);

  return {
    kpis,
    loading,
    error,
    fetchKPIs
  };
};