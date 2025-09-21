import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireActiveSubscription?: boolean;
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requireActiveSubscription = false, 
  fallbackPath 
}: ProtectedRouteProps) {
  const { status: authStatus } = useAuth();
  const { hasActive, loading: subLoading } = useSubscriptionStatus();
  const location = useLocation();

  // Show loading state while auth or subscription status is loading
  if (authStatus === 'loading' || (authStatus === 'signedIn' && subLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not signed in
  if (authStatus === 'signedOut') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Require active subscription but doesn't have it (only check after loading is complete)
  if (requireActiveSubscription && !subLoading && !hasActive) {
    const redirectPath = fallbackPath || '/pricing';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
