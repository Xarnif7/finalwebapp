import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/browser';
import { useAuth } from './useAuth';

export function useSmsStatus() {
  const { user } = useAuth();
  const [smsStatus, setSmsStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSmsStatus = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get business ID from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) {
        setSmsStatus({
          status: 'not_provisioned',
          from_number: null,
          verification_status: 'not_provisioned',
          last_verification_error: null
        });
        setLoading(false);
        return;
      }

      // Get business SMS data
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('from_number, verification_status, last_verification_error, surge_account_id')
        .eq('id', profile.business_id)
        .single();

      if (businessError) {
        throw businessError;
      }

      if (!businessData) {
        setSmsStatus({
          status: 'not_provisioned',
          from_number: null,
          verification_status: 'not_provisioned',
          last_verification_error: null
        });
      } else {
        // Determine status based on verification_status and from_number
        let status = 'not_provisioned';
        if (businessData.from_number) {
          status = businessData.verification_status || 'pending';
        }

        setSmsStatus({
          status,
          from_number: businessData.from_number,
          verification_status: businessData.verification_status,
          last_verification_error: businessData.last_verification_error,
          surge_account_id: businessData.surge_account_id
        });
      }
    } catch (err) {
      console.error('[SMS_STATUS] Error loading SMS status:', err);
      setError(err.message);
      setSmsStatus({
        status: 'error',
        from_number: null,
        verification_status: 'error',
        last_verification_error: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSmsStatus();
  }, [user?.id]);

  // Helper functions
  const isSmsEnabled = () => {
    return smsStatus?.status === 'active';
  };

  const isSmsPending = () => {
    return smsStatus?.status === 'pending';
  };

  const isSmsActionNeeded = () => {
    return smsStatus?.status === 'action_needed';
  };

  const isSmsNotProvisioned = () => {
    return smsStatus?.status === 'not_provisioned';
  };

  const getSmsStatusMessage = () => {
    if (!smsStatus) return 'Loading SMS status...';
    
    switch (smsStatus.status) {
      case 'active':
        return 'SMS is active and ready to send messages';
      case 'pending':
        return 'SMS number is pending verification. This usually takes 1-2 business days.';
      case 'action_needed':
        return `SMS verification needs attention: ${smsStatus.last_verification_error || 'Please check your SMS settings'}`;
      case 'not_provisioned':
        return 'No SMS number configured. Get started by adding a toll-free number.';
      case 'disabled':
        return 'SMS is currently disabled';
      case 'error':
        return 'Error loading SMS status';
      default:
        return 'SMS status unknown';
    }
  };

  return {
    smsStatus,
    loading,
    error,
    isSmsEnabled,
    isSmsPending,
    isSmsActionNeeded,
    isSmsNotProvisioned,
    getSmsStatusMessage,
    refreshSmsStatus: loadSmsStatus
  };
}
