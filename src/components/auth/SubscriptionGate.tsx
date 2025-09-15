import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

interface SubscriptionGateProps {
  children: React.ReactNode;
  allowTrialing?: boolean;
  fallbackPath?: string;
}

export function SubscriptionGate({ 
  children, 
  allowTrialing = true, 
  fallbackPath = '/pricing' 
}: SubscriptionGateProps) {
  const { status: authStatus } = useAuth();
  const { subStatus, hasActive, loading } = useSubscriptionStatus();
  const location = useLocation();

  // Show loading state
  if (authStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not signed in - redirect to login
  if (authStatus === 'signedOut') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check subscription status
  const hasValidSubscription = hasActive && (allowTrialing || subStatus === 'active');
  
  if (!hasValidSubscription) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
