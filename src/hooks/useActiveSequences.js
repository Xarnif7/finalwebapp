import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';

export const useActiveSequences = (businessId) => {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActiveSequences = async () => {
    if (!businessId) {
      setSequences([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/api/sequences/active/${businessId}`);
      
      if (response.success) {
        setSequences(response.sequences);
      } else {
        setError('Failed to fetch active sequences');
      }
    } catch (err) {
      console.error('Error fetching active sequences:', err);
      setError('Failed to fetch active sequences');
    } finally {
      setLoading(false);
    }
  };

  const updateSequenceStatus = async (sequenceId, status) => {
    try {
      const response = await apiClient.put(`/api/templates/${sequenceId}/status`, { status });
      
      if (response.success) {
        // Update the sequence in the local state
        setSequences(prev => 
          prev.map(sequence => 
            sequence.id === sequenceId 
              ? { ...sequence, status: status, updated_at: new Date().toISOString() }
              : sequence
          )
        );
        return { success: true, sequence: response.template };
      } else {
        throw new Error(response.error || 'Failed to update sequence status');
      }
    } catch (err) {
      console.error('Error updating sequence status:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchActiveSequences();
  }, [businessId]);

  return {
    sequences,
    loading,
    error,
    fetchActiveSequences,
    updateSequenceStatus
  };
};
