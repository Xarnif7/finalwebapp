import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { status: authStatus } = useAuth();
  const { hasActive, loading: subLoading } = useSubscriptionStatus();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authStatus === 'loading' || subLoading) return;

    const pathname = location.pathname;
    const search = location.search;

    // Preserve query params
    const preserveParams = (newPath: string) => {
      const newUrl = search ? `${newPath}${search}` : newPath;
      navigate(newUrl, { replace: true });
    };

    // Login/Signup pages
    if (pathname === '/login' || pathname === '/signup') {
      if (authStatus === 'signedIn') {
        if (hasActive) {
          preserveParams('/reporting');
        } else {
          preserveParams('/pricing');
        }
      }
      return;
    }

    // Dashboard/App pages
    if (pathname.startsWith('/reporting') || pathname.startsWith('/customers') || 
        pathname.startsWith('/automations') || pathname.startsWith('/reviews') || 
        pathname.startsWith('/settings') || pathname.startsWith('/public-feedback')) {
      
      if (authStatus === 'signedOut') {
        preserveParams('/login');
      } else if (authStatus === 'signedIn' && !hasActive) {
        preserveParams('/pricing');
      }
      return;
    }

    // Pricing page
    if (pathname === '/pricing') {
      if (authStatus === 'signedIn' && hasActive) {
        preserveParams('/reporting');
      }
      return;
    }

  }, [authStatus, hasActive, subLoading, navigate, location]);

  return <>{children}</>;
}
