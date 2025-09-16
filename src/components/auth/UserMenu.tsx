import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User as UserIcon, Repeat, CreditCard, Settings, LayoutDashboard } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { supabase } from '@/lib/supabase/browser';

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

export function UserMenu() {
  const { user } = useAuth();
  const { hasActive } = useSubscriptionStatus();
  const navigate = useNavigate();

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      await supabase.auth.signOut();
      // Clear any stored redirects
      localStorage.removeItem('postLoginRedirect');
      // Store the current path as redirect destination
      localStorage.setItem('postLoginRedirect', window.location.pathname);
      
      // Initiate Google OAuth for account switching
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
            include_granted_scopes: 'true'
          }
        }
      });

      if (error) {
        console.error('OAuth error:', error);
      }
    } catch (error) {
      console.error('Error switching account:', error);
    }
  };

  const handleBilling = () => {
    // TODO: Implement Stripe Customer Portal redirect
    navigate('/settings/billing');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="p-0">
          <UserAvatar user={user} size="40px" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-50">
        {hasActive && (
          <>
            <DropdownMenuItem onClick={() => navigate('/reporting')} className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              View Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleBilling} className="cursor-pointer">
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
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
  );
}
