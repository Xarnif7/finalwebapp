import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabaseClient';

export const useBusiness = () => {
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First try to get business from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('business_id')
          .eq('email', user.email)
          .single();

        if (profile && profile.business_id) {
          console.log('📋 Using business_id from profile:', profile.business_id);
          
          // Get the full business data
          const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', profile.business_id)
            .single();

          if (businessError) {
            console.error('Error fetching business from profile:', businessError);
            throw businessError;
          }

          setBusiness(businessData);
          setLoading(false);
          return;
        }

        // If no profile, try direct lookup by created_by
        console.log('No business ID in profile, trying direct lookup');
        
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('created_by', user.email)
          .single();

        if (businessError) {
          console.error('Error fetching business:', businessError);
          throw businessError;
        }

        setBusiness(businessData);
      } catch (err) {
        console.error('Error in useBusiness:', err);
        setError(err.message);
        setBusiness(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [user?.email]);

  return { business, loading, error };
};