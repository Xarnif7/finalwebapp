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
import { useAuth } from '../auth/AuthProvider';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';
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
      className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] text-white rounded-full flex items-center justify-center font-semibold text-sm ring-2 ring-transparent group-hover:ring-purple-300 group-focus:ring-purple-400 transition-all cursor-pointer"
      style={{ width: size, height: size }}
    >
      {getInitials()}
    </div>
  );
};

export function Header() {
  const { status: authStatus, user } = useAuth();
  const { active: hasActive, loading: subLoading } = useSubscriptionStatus();
  const navigate = useNavigate();
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

  const handleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
    } catch (error) {
      console.error('OAuth error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/', { replace: true });
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('postLoginRedirect');
      localStorage.setItem('postLoginRedirect', window.location.pathname);
      
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
    } catch (error) {
      console.error('Error switching account:', error);
    }
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
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2 text-sm font-medium rounded-xl"
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
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2 text-sm font-medium rounded-xl"
          >
            View Dashboard
          </Button>
        );
      } else {
        return (
          <Button
            onClick={() => navigate('/pricing')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2 text-sm font-medium rounded-xl"
          >
            Get Started
          </Button>
        );
      }
    }

    return null;
  };

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
          <Link to="/features" className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 relative group">Features<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span></Link>
          <Link to="/how-it-works" className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 relative group">How It Works<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span></Link>
          <Link to="/simple-setup" className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 relative group">Simple Setup<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span></Link>
          <Link to="/testimonials" className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 relative group">Testimonials<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span></Link>
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
                <DropdownMenuItem onClick={handleSwitchAccount} className="cursor-pointer">
                  <Repeat className="mr-2 h-4 w-4" />
                  Switch Account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer">
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
