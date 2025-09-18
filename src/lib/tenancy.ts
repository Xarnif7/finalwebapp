import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../hooks/useAuth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function useCurrentBusinessId() {
  const { user, status: authStatus } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBusinessId() {
      if (authStatus !== 'signedIn' || !user) {
        setBusinessId(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('business_id')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.error('[tenancy] Error fetching business_id:', profileError);
          setError('Failed to load business information');
          setBusinessId(null);
        } else if (data?.business_id) {
          setBusinessId(data.business_id);
        } else {
          setError('No business assigned to your account');
          setBusinessId(null);
        }
      } catch (err) {
        console.error('[tenancy] Unexpected error:', err);
        setError('Failed to load business information');
        setBusinessId(null);
      } finally {
        setLoading(false);
      }
    }

    fetchBusinessId();
  }, [user, authStatus]);

  return {
    businessId,
    loading,
    error,
    isAuthenticated: authStatus === 'signedIn'
  };
}

// Helper function to get business info
export async function getBusinessInfo(businessId: string) {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, created_at')
    .eq('id', businessId)
    .single();

  if (error) {
    console.error('[tenancy] Error fetching business info:', error);
    return null;
  }

  return data;
}

// Helper function to get team members for a business
export async function getTeamMembers(businessId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      user_id,
      role,
      created_at,
      auth_users:user_id (
        email
      )
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[tenancy] Error fetching team members:', error);
    return [];
  }

  return data || [];
}
