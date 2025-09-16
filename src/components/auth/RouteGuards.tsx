'use client';

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';

// Guard for /login - redirect if already signed in
export function LoginGuard({ children }: { children: React.ReactNode }) {
  const { status: authStatus } = useAuth();
  const { hasActive } = useSubscriptionStatus();
  const navigate = useNavigate();

  useEffect(() => {
    if (authStatus === 'signedIn') {
      // Already signed in: send to dashboard if active, else to landing (no auto /pricing)
      navigate(hasActive ? '/reporting' : '/', { replace: true });
    }
  }, [authStatus, hasActive, navigate]);

  // Only render children if not signed in
  if (authStatus === 'signedIn') {
    return null; // Will redirect
  }

  return <>{children}</>;
}

// Guard for /dashboard - redirect if not signed in or no active subscription
export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { status: authStatus } = useAuth();
  const { hasActive } = useSubscriptionStatus();
  const navigate = useNavigate();

  useEffect(() => {
    if (authStatus === 'signedOut') {
      // Not signed in, go to login
      navigate('/login', { replace: true });
    } else if (authStatus === 'signedIn' && !hasActive) {
      // Signed in but no active subscription, go to pricing
      navigate('/pricing', { replace: true });
    }
  }, [authStatus, hasActive, navigate]);

  // Only render children if signed in with active subscription
  if (authStatus === 'signedIn' && hasActive) {
    return <>{children}</>;
  }

  return null; // Will redirect
}
