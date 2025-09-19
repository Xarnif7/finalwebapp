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
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('[tenancy] Error fetching business_id:', profileError);
          
          // If no profile exists, create one with a business
          if (profileError.code === 'PGRST116') {
            console.log('[tenancy] No profile found, creating business and profile for new user');
            
            try {
              // Create a business first
              const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .insert({
                  name: `${user.email?.split('@')[0] || 'User'}'s Business`
                })
                .select('id')
                .single();

              if (businessError) {
                console.error('[tenancy] Error creating business:', businessError);
                setError('Failed to create business');
                setBusinessId(null);
                return;
              }

              // Create profile linking user to business
              const { error: profileCreateError } = await supabase
                .from('profiles')
                .insert({
                  id: user.id,
                  business_id: businessData.id,
                  role: 'owner'
                });

              if (profileCreateError) {
                console.error('[tenancy] Error creating profile:', profileCreateError);
                setError('Failed to create user profile');
                setBusinessId(null);
                return;
              }

              setBusinessId(businessData.id);
              setError(null);
              console.log('[tenancy] Successfully created business and profile for new user');
            } catch (createErr) {
              console.error('[tenancy] Error during business/profile creation:', createErr);
              setError('Failed to set up account');
              setBusinessId(null);
            }
          } else {
            setError('Failed to load business information');
            setBusinessId(null);
          }
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
