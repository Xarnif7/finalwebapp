import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '../lib/supabase/browser';

export function useBusiness() {
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setBusiness(null);
      setLoading(false);
      return;
    }

    const fetchBusiness = async () => {
      try {
        setLoading(true);
        setError(null);

        // First try: Get from profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('business_id')
          .eq('id', user.id)
          .single();

        let businessId = null;

        if (!profileError && profile?.business_id) {
          businessId = profile.business_id;
          console.log('📋 Using business_id from profile:', businessId);
        } else {
          // Fallback: Find business by email
          console.log('📋 Profile business_id not found, trying email-based lookup for:', user.email);
          
          const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('id')
            .eq('created_by', user.email)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!businessError && business) {
            businessId = business.id;
            console.log('📋 Found business by email:', businessId);
          }
        }

        if (businessId) {
          // Fetch full business data
          const { data: businessData, error: businessDataError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .single();

          if (!businessDataError && businessData) {
            setBusiness(businessData);
          } else {
            console.error('Error fetching business data:', businessDataError);
            setError('Failed to fetch business data');
          }
        } else {
          console.log('📋 No business found for user');
          setBusiness(null);
        }
      } catch (err) {
        console.error('Error in useBusiness:', err);
        setError('Failed to load business');
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [user]);

  return { business, loading, error };
}
