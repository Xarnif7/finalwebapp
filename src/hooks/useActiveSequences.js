import { useState, useEffect } from 'react';
import { useAuth } from '../components/auth/AuthProvider';
import { supabase } from '../lib/supabase/browser';
import { apiClient } from '../lib/apiClient';

export const useActiveSequences = () => {
  const { user } = useAuth();
  const [sequences, setSequences] = useState([]);
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

  const fetchActiveSequences = async () => {
    if (!businessId) {
      setSequences([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/api/active-sequences/${businessId}`);
      
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
      const response = await apiClient.put(`/api/active-sequences/${sequenceId}/status`, { status });
      
      if (response.success) {
        // Update the sequence in the local state
        setSequences(prev => 
          prev.map(sequence => 
            sequence.id === sequenceId 
              ? { ...sequence, status: status, updated_at: new Date().toISOString() }
              : sequence
          )
        );
        return { success: true, sequence: response.sequence };
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
