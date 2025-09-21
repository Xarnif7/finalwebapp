import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Repeat } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { signInWithGoogle, switchAccount } from '../../lib/auth-utils';
import { supabase } from '../../lib/supabase/browser';

const UserAvatar = ({ user, size = "40px" }) => {
  const getInitials = () => {
    // Try to get full name from user metadata first, then fallback to email
    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name;
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <div 
      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm ring-2 ring-transparent group-hover:ring-purple-300 group-focus:ring-purple-400 transition-all cursor-pointer"
      style={{ width: size, height: size }}
    >
      {getInitials()}
    </div>
  );
};

export function Header() {
  const { status: authStatus, user } = useAuth();
  const subscriptionStatus = useSubscriptionStatus();
  const { hasActive, loading: subLoading } = subscriptionStatus;
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('[HEADER] Subscription status:', subscriptionStatus);
    console.log('[HEADER] Auth status:', authStatus);
    console.log('[HEADER] User:', user?.id);
  }, [subscriptionStatus, authStatus, user]);

  // Listen for auth state changes to force re-render
  useEffect(() => {
    const handleAuthStateChange = () => {
      console.log('Header: Auth state changed, forcing re-render');
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('authStateChanged', handleAuthStateChange);
    return () => window.removeEventListener('authStateChanged', handleAuthStateChange);
  }, []);

  // Listen for scroll to add shadow effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignIn = async () => {
    await signInWithGoogle();
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      // Navigate to home page after sign out
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSwitchAccount = async () => {
    await switchAccount();
  };

  const getPrimaryCTA = () => {
    if (authStatus === 'loading' || subLoading) {
      return (
        <div className="h-10 w-24 bg-gray-200 rounded-xl animate-pulse" />
      );
    }

    if (authStatus === 'signedOut') {
      return (
        <Button
          onClick={handleSignIn}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2 text-sm font-sans font-semibold rounded-xl"
        >
          Sign in
        </Button>
      );
    }

    if (authStatus === 'signedIn') {
      if (hasActive) {
        return (
          <Button
            onClick={() => navigate('/dashboard')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2 text-sm font-sans font-semibold rounded-xl"
          >
            View Dashboard
          </Button>
        );
      } else {
        return (
          <Button
            onClick={() => navigate('/pricing')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2 text-sm font-sans font-semibold rounded-xl"
          >
            Get Started
          </Button>
        );
      }
    }

    return null;
  };

  return (
    <header key={refreshKey} className={`fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md border-b border-black/5 transition-shadow duration-200 ${isScrolled ? 'sticky-header-shadow' : ''}`}>
      <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex-shrink-0" style={{ background: 'transparent', border: 'none', outline: 'none' }}>
          <img
            src="/images/blipp-logo-simple.svg"
            alt="Blipp"
            className="h-6 sm:h-8 w-auto hover:opacity-80 transition-opacity duration-300"
            style={{
              background: 'transparent !important',
              border: 'none !important',
              outline: 'none !important',
              boxShadow: 'none !important',
              borderRadius: '0 !important',
              padding: '0 !important',
              margin: '0 !important',
              display: 'block !important',
              backgroundColor: 'transparent !important',
              backgroundImage: 'none !important'
            }}
            onError={(e) => {
              console.error('[HEADER] Logo failed to load:', e.target.src);
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <span 
            className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            style={{ display: 'none' }}
          >
            Blipp
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-7">
          <Link to="/features" className="text-[#0F172A] font-sans font-semibold text-base relative group pb-2 transition-colors duration-200">
            <span className="relative z-10">Features</span>
            <span className="nav-underline absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
          </Link>
          <Link to="/how-it-works" className="text-[#0F172A] font-sans font-semibold text-base relative group pb-2 transition-colors duration-200">
            <span className="relative z-10">How It Works</span>
            <span className="nav-underline absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
          </Link>
          <Link to="/simple-setup" className="text-[#0F172A] font-sans font-semibold text-base relative group pb-2 transition-colors duration-200">
            <span className="relative z-10">Simple Setup</span>
            <span className="nav-underline absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
          </Link>
          <Link to="/testimonials" className="text-[#0F172A] font-sans font-semibold text-base relative group pb-2 transition-colors duration-200">
            <span className="relative z-10">Testimonials</span>
            <span className="nav-underline absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
          </Link>
        </nav>
        <div className="flex items-center gap-3 md:gap-4">
          {getPrimaryCTA()}
          {authStatus === 'signedIn' && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0">
                  <UserAvatar user={user} size="40px" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 z-50">
                {user?.email && (
                  <>
                    <div className="px-2 py-1.5 text-sm text-gray-600 font-medium">
                      {user.email}
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleSwitchAccount} className="cursor-pointer font-sans">
                  <Repeat className="mr-2 h-4 w-4" />
                  Switch Account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer font-sans">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
