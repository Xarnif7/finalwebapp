import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';

export function useHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/api/health');
      
      if (response.success) {
        setHealth(response.health);
      } else {
        setError(response.error || 'Failed to fetch health data');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    
    // Refresh health data every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    health,
    loading,
    error,
    refetch: fetchHealth
  };
}
