import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase/browser';

export default function AuthCallback() {
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const handleAuthCallback = async () => {
      try {
        console.log('[AuthCallback] Starting OAuth callback handling...');
        
        // Wait a moment for the OAuth flow to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check for session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('[AuthCallback] Session check result:', { 
          hasSession: !!session, 
          error: error?.message,
          user: session?.user?.email 
        });
        
        if (error) {
          console.error('[AuthCallback] Session error:', error);
          navigate('/', { replace: true });
          return;
        }

        if (session && session.user) {
          console.log('[AuthCallback] Successfully authenticated, checking subscription status...');
          
          // Check subscription and onboarding status
          try {
            // Check subscription status from subscriptions table
            const { data: subscriptions } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('user_id', session.user.id)
              .eq('deleted', false)
              .order('created_at', { ascending: false })
              .limit(1);
            
            const hasActiveSubscription = subscriptions && subscriptions.length > 0 && 
              ['active', 'trialing'].includes(subscriptions[0].status);
            
            // Check business/onboarding status
            const { data: businesses } = await supabase
              .from('businesses')
              .select('*')
              .limit(1);
            
            const business = businesses?.[0];
            const onboardingCompleted = business?.onboarding_completed;
            
            console.log('[AuthCallback] Status check:', { 
              hasActiveSubscription, 
              onboardingCompleted,
              subStatus: subscriptions?.[0]?.status 
            });
            
            let dest;
            if (hasActiveSubscription) {
              if (onboardingCompleted) {
                dest = '/reporting'; // Main dashboard
              } else {
                dest = '/onboarding'; // Complete onboarding first
              }
            } else {
              dest = '/pricing'; // No active subscription - go to pricing
            }
            
            // Use stored redirect if available, otherwise use calculated dest
            const storedDest = localStorage.getItem('postLoginRedirect');
            if (storedDest && storedDest !== '/') {
              dest = storedDest;
            }
            
            localStorage.removeItem('postLoginRedirect');
            console.log('[AuthCallback] Redirecting to:', dest);
            
            // Force a page refresh to ensure all components re-render with new auth state
            window.location.href = dest;
            
          } catch (subError) {
            console.error('[AuthCallback] Subscription check error:', subError);
            // Fallback to paywall if we can't check subscription
            navigate('/paywall', { replace: true });
          }
        } else {
          console.log('[AuthCallback] No valid session, redirecting to landing...');
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('[AuthCallback] Unexpected error:', error);
        navigate('/', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  // Return a blank white screen to eliminate any flash
  return (
    <div className="fixed inset-0 bg-white z-50">
      {/* Completely blank - no flash */}
    </div>
  );
}
