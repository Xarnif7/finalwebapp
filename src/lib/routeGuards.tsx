import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/auth/AuthProvider';
import { getSubscriptionStatusWithTimeout } from './subscription';

export function useAuthGate() {
  const { user, loading } = useAuth();
  
  return { 
    ready: !loading, 
    session: user ? { user } : null 
  };
}

export function useRouteGuard() {
  const { ready, session } = useAuthGate();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!ready) return;

    // If no session, redirect to landing page (not login)
    if (!session) {
      navigate('/', { replace: true });
      return;
    }

    // If session exists, check subscription status asynchronously
    const checkSubscription = async () => {
      const status = await getSubscriptionStatusWithTimeout(6000);
      
      if (status === 'active' && !location.pathname.startsWith('/dashboard')) {
        navigate('/dashboard', { replace: true });
      } else if (status !== 'active' && location.pathname !== '/paywall') {
        navigate('/paywall', { replace: true });
      }
    };

    checkSubscription();
  }, [ready, session, navigate, location.pathname]);

  return { ready, session };
}
