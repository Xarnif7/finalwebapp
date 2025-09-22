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
        // Map API response to frontend expected format
        const apiKpis = response.kpis;
        const mappedKpis = {
          // Map from API field names to frontend expected names
          activeSequences: apiKpis.activeSequences || apiKpis.active_sequences_count || 0,
          sendSuccessRate: apiKpis.sendSuccessRate || apiKpis.send_success_pct || 0,
          failureRate: apiKpis.failureRate || apiKpis.failure_rate_pct || 0,
          totalRecipients: apiKpis.totalRecipients || apiKpis.total_recipients || 0,
          totalSends: apiKpis.totalSends || apiKpis.messages_sent || 0,
          successfulSends: apiKpis.successfulSends || apiKpis.messages_sent || 0,
          failedSends: apiKpis.failedSends || (apiKpis.messages_sent - apiKpis.messages_sent) || 0,
          customersInSequences: apiKpis.customersInSequences || 0,
          conversionRate7d: apiKpis.conversionRate7d || 0,
          hasData: apiKpis.hasData || false
        };
        setKpis(mappedKpis);
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