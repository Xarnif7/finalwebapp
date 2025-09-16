import { useState, useEffect } from "react";
import { useAuth } from "../components/auth/AuthProvider";
import { supabase } from "../lib/supabase/browser";

// Hook to check if user has completed onboarding
export function useOnboardingStatus() {
  const { user, isAuthenticated } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setOnboardingCompleted(false);
      setLoading(false);
      return;
    }

    const checkOnboardingStatus = async () => {
      try {
        setLoading(true);
        
        // Check profile onboarding_completed status - RLS will automatically filter by auth.uid()
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('[ONBOARDING_STATUS] Profile error:', profileError);
        }

        setOnboardingCompleted(profile?.onboarding_completed || false);
      } catch (error) {
        console.error('[ONBOARDING_STATUS] Error checking status:', error);
        setOnboardingCompleted(false);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user, isAuthenticated]);

  return { onboardingCompleted, loading };
}
