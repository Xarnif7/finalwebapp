import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { apiClient } from '../lib/apiClient';

export const useSequencesData = () => {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSequences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const result = await apiClient.get('/api/sequences');
      if (result.ok) {
        setSequences(result.sequences);
      } else {
        throw new Error(result.error || 'Failed to fetch sequences');
      }
    } catch (err) {
      console.error('Error fetching sequences:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const pauseSequence = useCallback(async (sequenceId) => {
    try {
      // Optimistic update
      setSequences(prev => prev.map(seq => 
        seq.id === sequenceId 
          ? { ...seq, status: 'paused' }
          : seq
      ));

      const response = await apiClient.post(`/api/sequences/${sequenceId}/pause`, {});

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Failed to pause sequence');
      }

      // Refresh data to ensure consistency
      await fetchSequences();
    } catch (err) {
      console.error('Error pausing sequence:', err);
      setError(err.message);
      // Revert optimistic update
      await fetchSequences();
    }
  }, [fetchSequences]);

  const resumeSequence = useCallback(async (sequenceId) => {
    try {
      // Optimistic update
      setSequences(prev => prev.map(seq => 
        seq.id === sequenceId 
          ? { ...seq, status: 'active' }
          : seq
      ));

      const response = await apiClient.post(`/api/sequences/${sequenceId}/resume`, {});

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Failed to resume sequence');
      }

      // Refresh data to ensure consistency
      await fetchSequences();
    } catch (err) {
      console.error('Error resuming sequence:', err);
      setError(err.message);
      // Revert optimistic update
      await fetchSequences();
    }
  }, [fetchSequences]);

  const duplicateSequence = useCallback(async (sequenceId) => {
    try {
      const response = await apiClient.post(`/api/sequences/${sequenceId}/duplicate`, {});

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Failed to duplicate sequence');
      }

      // Refresh data to show the new sequence
      await fetchSequences();
    } catch (err) {
      console.error('Error duplicating sequence:', err);
      setError(err.message);
    }
  }, [fetchSequences]);

  const archiveSequence = useCallback(async (sequenceId) => {
    try {
      // Optimistic update
      setSequences(prev => prev.map(seq => 
        seq.id === sequenceId 
          ? { ...seq, status: 'archived' }
          : seq
      ));

      const response = await apiClient.post(`/api/sequences/${sequenceId}/archive`, {});

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Failed to archive sequence');
      }

      // Refresh data to ensure consistency
      await fetchSequences();
    } catch (err) {
      console.error('Error archiving sequence:', err);
      setError(err.message);
      // Revert optimistic update
      await fetchSequences();
    }
  }, [fetchSequences]);

  const createSequence = useCallback(async (sequenceData) => {
    try {
      const response = await apiClient.post('/api/sequences', sequenceData);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Failed to create sequence');
      }

      // Refresh data to show the new sequence
      await fetchSequences();
      
      return result.sequence;
    } catch (err) {
      console.error('Error creating sequence:', err);
      setError(err.message);
      throw err;
    }
  }, [fetchSequences]);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  return {
    sequences,
    loading,
    error,
    refetch: fetchSequences,
    pauseSequence,
    resumeSequence,
    duplicateSequence,
    archiveSequence,
    createSequence
  };
};
