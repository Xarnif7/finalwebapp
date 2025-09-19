import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useZapierStatus = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkZapierConnection = async () => {
    try {
      setLoading(true);
      setError(null);

      // Test the Zapier ping endpoint with a test token
      const response = await fetch('/api/zapier/ping', {
        method: 'GET',
        headers: {
          'X-Zapier-Token': 'test-token'
        }
      });

      if (response.ok) {
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
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
  }, []);

  return {
    isConnected,
    loading,
    error,
    refetch: checkZapierConnection
  };
};
