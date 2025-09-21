import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';

export function useCustomers(businessId) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/api/customers?business_id=${businessId}`);
        
        if (response.success) {
          setCustomers(response.data || []);
        } else {
          setError(response.error || 'Failed to fetch customers');
        }
      } catch (err) {
        console.error('Error fetching customers:', err);
        setError('Failed to fetch customers');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [businessId]);

  return {
    customers,
    loading,
    error,
    hasCustomers: customers.length > 0
  };
}
