import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabaseClient';

export const useBusiness = () => {
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.email) {
      setBusiness(null);
      setLoading(false);
      return;
    }

    const fetchBusiness = async () => {
      try {
        setLoading(true);
        
        // Get business by email (using the email-based data persistence)
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('created_by', user.email)
          .single();

        if (businessError && businessError.code !== 'PGRST116') {
          console.error('Error fetching business:', businessError);
          setError(businessError.message);
          return;
        }

        if (!businessData) {
          console.log('No business found, creating new business for:', user.email);
          
          // Create business if it doesn't exist
          const { data: newBusiness, error: createError } = await supabase
            .from('businesses')
            .insert({
              name: user.user_metadata?.business_name || 'My Business',
              created_by: user.email,
              email: user.email,
              phone: user.user_metadata?.phone || null,
              website: user.user_metadata?.website || null
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating business:', createError);
            // Don't set error, just continue with null business
            // This allows the UI to still render
            setBusiness(null);
            return;
          }

          console.log('Successfully created business:', newBusiness);
          setBusiness(newBusiness);
        } else {
          console.log('Found existing business:', businessData);
          setBusiness(businessData);
        }
      } catch (err) {
        console.error('Error in fetchBusiness:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [user?.email]);

  return { business, loading, error };
};