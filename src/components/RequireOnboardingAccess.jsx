import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

// Component that gates access to onboarding based on subscription status
export default function RequireOnboardingAccess({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const hasCheckedRef = useRef(false);
  const checkTimeoutRef = useRef(null);

  console.log('[ONBOARDING_GUARD] State:', { 
    user: !!user, 
    authLoading,
    currentPath: location.pathname,
    hasChecked: hasCheckedRef.current
  });

  // Render immediately, handle auth/subscription in background
  useEffect(() => {
    if (authLoading || hasCheckedRef.current) return; // Wait for auth to be ready or already checked
    
    // If no user, redirect to login
    if (!user) {
      console.log('[ONBOARDING_GUARD] No user, redirecting to login');
      hasCheckedRef.current = true;
      navigate('/login', { replace: true });
      return;
    }
    
    // Check if user just paid - allow them to complete onboarding
    const justPaid = sessionStorage.getItem('justPaid') === '1';
    if (justPaid) {
      console.log('[ONBOARDING_GUARD] User just paid, allowing onboarding completion');
      hasCheckedRef.current = true;
      return; // Allow onboarding to render
    }
    
    // If user exists, check subscription status with shorter timeout
    const checkSubscription = async () => {
      try {
        hasCheckedRef.current = true;
        performance.mark('guard-subscription-check-start');
        console.log('[ONBOARDING_GUARD] Starting subscription check');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // Reduced to 2 seconds for faster response
        
        const response = await fetch('/api/subscription/status?t=' + Date.now(), {
          credentials: 'include',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        performance.mark('guard-subscription-check-end');
        performance.measure('guard-subscription-check', 'guard-subscription-check-start', 'guard-subscription-check-end');
        
        const checkMeasure = performance.getEntriesByName('guard-subscription-check')[0];
        console.log(`[ONBOARDING_GUARD] Subscription check completed in ${checkMeasure.duration.toFixed(2)}ms`);
        
        if (!response.ok) {
          console.log('[ONBOARDING_GUARD] Subscription check failed, redirecting to paywall');
          navigate('/paywall', { replace: true });
          return;
        }
        
        const data = await response.json();
        
        // Check current pathname to avoid ping-pong loops
        if (location.pathname === '/onboarding') {
          console.log('[ONBOARDING_GUARD] Checking onboarding access:', { 
            pathname: location.pathname, 
            data_active: data.active, 
            onboarding_completed: data.onboarding_completed,
            user_id: user?.id 
          });
          
          // If user is on onboarding page and has active subscription, always allow them to complete onboarding
          // Don't redirect based on subscription status while they're actively filling out the form
          if (data.active) {
            console.log('[ONBOARDING_GUARD] User has active subscription, allowing onboarding completion');
            // Allow them to complete onboarding - don't redirect
          } else {
            console.log('[ONBOARDING_GUARD] User has no subscription, redirecting to paywall');
            navigate('/paywall', { replace: true });
          }
        }
      } catch (error) {
        console.error('[ONBOARDING_GUARD] Subscription check failed:', error);
        console.log('[ONBOARDING_GUARD] Error occurred, redirecting to paywall');
        navigate('/paywall', { replace: true });
      }
    };
    
    // Add a timeout to prevent hanging
    checkTimeoutRef.current = setTimeout(() => {
      console.log('[ONBOARDING_GUARD] Check timeout reached, redirecting to paywall');
      hasCheckedRef.current = true;
      navigate('/paywall', { replace: true });
    }, 5000); // 5 second timeout
    
    checkSubscription();
  }, [user, authLoading, navigate, location.pathname]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, []);
  
  // Always render children immediately - no blocking
  return children;
}
