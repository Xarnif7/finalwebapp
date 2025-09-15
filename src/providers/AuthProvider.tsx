'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

export interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: User | null;
  session: Session | null;
}

export interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    status: 'loading',
    user: null,
    session: null,
  });

  useEffect(() => {
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

        // Handle specific auth events
        if (event === 'SIGNED_IN' && session) {
          console.log('User signed in:', session.user.email);
          // Force a re-render of any cached components
          window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { event: 'SIGNED_IN' } }));
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          // Force a re-render of any cached components
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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
