import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../components/auth/AuthProvider';

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
          
          // If no profile exists, try to find business by email and create profile
          if (profileError.code === 'PGRST116') {
            console.log('[tenancy] No profile found, checking for existing business by email');
            
            try {
              // Check if a business already exists for this email
              const { data: existingBusiness, error: businessCheckError } = await supabase
                .from('businesses')
                .select('id')
                .eq('created_by', user.email)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              if (!businessCheckError && existingBusiness) {
                // Business exists, just create the profile
                const businessId = existingBusiness.id;
                console.log('[tenancy] Found existing business:', businessId);
                
                const { error: profileCreateError } = await supabase
                  .from('profiles')
                  .insert({
                    id: user.id,
                    business_id: businessId,
                    role: 'owner'
                  });

                if (profileCreateError) {
                  console.error('[tenancy] Error creating profile for existing business:', profileCreateError);
                  setError('Failed to create user profile');
                  setBusinessId(null);
                  return;
                }

                setBusinessId(businessId);
                setError(null);
                console.log('[tenancy] Successfully created profile for existing business');
              } else {
                // No business exists - create one automatically
                console.log('[tenancy] No existing business found - creating new business and profile automatically');
                
                try {
                  // Create a new business
                  const { data: newBusiness, error: businessCreateError } = await supabase
                    .from('businesses')
                    .insert({
                      name: `${user.email?.split('@')[0] || 'User'}'s Business`,
                      created_by: user.email,
                      industry: 'General',
                      address: 'Unknown',
                      phone: '',
                      email: user.email
                    })
                    .select('id')
                    .single();

                  if (businessCreateError) {
                    console.error('[tenancy] Error creating business:', businessCreateError);
                    setError('Failed to create business');
                    setBusinessId(null);
                    return;
                  }

                  const businessId = newBusiness.id;
                  console.log('[tenancy] Created new business:', businessId);

                  // Create profile linked to the new business
                  const { error: profileCreateError } = await supabase
                    .from('profiles')
                    .insert({
                      id: user.id,
                      business_id: businessId,
                      role: 'owner'
                    });

                  if (profileCreateError) {
                    console.error('[tenancy] Error creating profile for new business:', profileCreateError);
                    setError('Failed to create user profile');
                    setBusinessId(null);
                    return;
                  }

                  setBusinessId(businessId);
                  setError(null);
                  console.log('[tenancy] Successfully created business and profile automatically');
                } catch (createErr) {
                  console.error('[tenancy] Error during automatic business creation:', createErr);
                  setError('Failed to set up account automatically');
                  setBusinessId(null);
                }
              }
            } catch (createErr) {
              console.error('[tenancy] Error during profile creation:', createErr);
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
