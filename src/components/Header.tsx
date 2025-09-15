'use client';

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { AuthCTA } from '@/components/auth/AuthCTA';
import { UserMenu } from '@/components/auth/UserMenu';

export function Header() {
  const { status: authStatus } = useAuth();
  const { hasActive, loading: subLoading } = useSubscriptionStatus();
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for auth state changes to force re-render
  useEffect(() => {
    const handleAuthStateChange = () => {
      console.log('Header: Auth state changed, forcing re-render');
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('authStateChanged', handleAuthStateChange);
    return () => window.removeEventListener('authStateChanged', handleAuthStateChange);
  }, []);

  // Show loading state to prevent flicker
  if (authStatus === 'loading' || subLoading) {
    return (
      <header key={refreshKey} className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <Link to="/" className="flex-shrink-0">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/0e243f198_NEWBLIPPLOGO.png"
              alt="Blipp"
              className="h-16 w-auto"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-18 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </nav>
          <div className="flex items-center gap-3">
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header key={refreshKey} className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/50">
      <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
        <Link to="/" className="flex-shrink-0">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/0e243f198_NEWBLIPPLOGO.png"
            alt="Blipp"
            className="h-16 w-auto"
          />
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="/features"
            className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 relative group"
          >
            Features
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link
            to="/how-it-works"
            className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 relative group"
          >
            How It Works
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link
            to="/simple-setup"
            className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 relative group"
          >
            Simple Setup
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link
            to="/testimonials"
            className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 relative group"
          >
            Testimonials
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span>
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <AuthCTA />
          {authStatus === 'signedIn' && <UserMenu />}
        </div>
      </div>
    </header>
  );
}
