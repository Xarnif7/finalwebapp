import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';

export const useAutomationLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/api/automation-logs');
      
      if (response.ok) {
        setLogs(response.logs || []);
      } else {
        throw new Error(response.error || 'Failed to fetch automation logs');
      }
    } catch (err) {
      console.error('Error fetching automation logs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
  };
};