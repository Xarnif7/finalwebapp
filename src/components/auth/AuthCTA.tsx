import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { signInWithGoogle } from '@/lib/auth-utils';
import { UserMenu } from './UserMenu';

export function AuthCTA() {
  const { status: authStatus, user } = useAuth();
  const { subStatus, hasActive, loading: subLoading } = useSubscriptionStatus();

  const handleSignIn = async () => {
    try {
      // Store the current path as redirect destination
      localStorage.setItem('postLoginRedirect', window.location.pathname);
      
      // Initiate Google OAuth
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  // Show loading state to prevent flicker
  if (authStatus === 'loading' || subLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  // Signed out state
  if (authStatus === 'signedOut') {
    return (
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={handleSignIn}>
          Sign In
        </Button>
        <Button onClick={handleSignIn} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          Get Started
        </Button>
      </div>
    );
  }

  // Signed in state
  if (authStatus === 'signedIn' && user) {
    // No active subscription
    if (!hasActive) {
      return (
        <div className="flex items-center gap-3">
          <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <Link to="/pricing">View Plans</Link>
          </Button>
          <UserMenu />
        </div>
      );
    }

    // Has active subscription
    return (
      <div className="flex items-center gap-3">
        <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <Link to="/reporting">View Dashboard</Link>
        </Button>
        <UserMenu />
      </div>
    );
  }

  // Fallback (shouldn't reach here)
  return null;
}
