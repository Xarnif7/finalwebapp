'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase/browser';

export interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: User | null;
  session: Session | null;
}

export interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default auth state for when used outside provider
const defaultAuthState: AuthContextType = {
  status: 'signedOut',
  user: null,
  session: null,
  signOut: async () => {
    console.warn('signOut called outside AuthProvider context');
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    status: 'loading',
    user: null,
    session: null,
  });

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // Dev-only marker to detect provider mount location
      console.info('[AUTH] Provider mounted (tree):', typeof window === 'undefined' ? 'server/app' : 'client/pages-or-app');
    }

        // Skip env check since we're using hardcoded values
        console.log('[AUTH] Using hardcoded Supabase client');

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
          setAuthState({ status: 'signedOut', user: null, session: null });
          return;
        }

        setAuthState({
          status: session ? 'signedIn' : 'signedOut',
          user: session?.user ?? null,
          session,
        });
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        setAuthState({ status: 'signedOut', user: null, session: null });
      }
    };

    getInitialSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        setAuthState({
          status: session ? 'signedIn' : 'signedOut',
          user: session?.user ?? null,
          session,
        });

        // Handle specific auth events - update state only; no global reloads here
        if (event === 'SIGNED_IN' && session) {
          console.log('[AUTH] User signed in:', session.user.email);
          console.log('[AUTH] Current URL before auth event:', window.location.href);
          window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { event: 'SIGNED_IN' } }));
        } else if (event === 'SIGNED_OUT') {
          console.log('[AUTH] User signed out');
          window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { event: 'SIGNED_OUT' } }));
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    signOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Safe useAuth hook that never throws
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  // Return default state if used outside provider instead of throwing
  if (context === undefined) {
    console.warn('useAuth used outside AuthProvider context, returning default signedOut state');
    return defaultAuthState;
  }
  
  return context;
}
