import { createContext, useContext, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const AuthCtx = createContext(null);
export const useAuth = () => {
  const context = useContext(AuthCtx);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false); // Start with false to eliminate loading screen
  const authInitialized = useRef(false);
  const authSubscription = useRef(null);

  // Initialize auth state on mount - only run once
  useEffect(() => {
    if (authInitialized.current) return;
    authInitialized.current = true;

    console.log("[AUTH] Initializing auth provider");

    const initializeAuth = async () => {
      try {
        console.log("[AUTH] Getting initial session");
        // Get initial session without triggering navigation
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[AUTH] Session check failed:", error);
        }
        
        console.log("[AUTH] Initial session:", !!session?.user, session?.user?.email);
        setUser(session?.user ?? null);
        setLoading(false); // Ensure loading is false after session check
        console.log("[AUTH] Auth initialization complete");
      } catch (error) {
        console.error("[AUTH] Auth initialization failed:", error);
        setUser(null);
        setLoading(false);
      }
    };

    // Don't set loading to true - this causes the flash
    initializeAuth();
  }, []);

  // Subscribe to auth state changes - ONLY ONCE
  useEffect(() => {
    // Only register if not already registered
    if (authSubscription.current) return;

    console.log("[AUTH] Registering auth state change listener");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[AUTH] Auth state change:", event, session?.user?.email);
        
        // Reset client state on sign out or user change
        if (event === 'SIGNED_OUT' || (user && session?.user?.id !== user.id)) {
          console.log("[AUTH] Clearing client state due to sign out or user change");
          localStorage.removeItem('postLoginRedirect');
          sessionStorage.removeItem('justPaid');
          
          // Clear cookies on the client
          document.cookie = 'sub_granted=; Max-Age=0; Path=/; SameSite=Lax; Secure';
          document.cookie = 'sub_granted_uid=; Max-Age=0; Path=/; SameSite=Lax; Secure';
        }
        
        // Update user state only - no navigation here
        setUser(session?.user ?? null);
      }
    );

    authSubscription.current = subscription;

    return () => {
      if (authSubscription.current) {
        console.log("[AUTH] Unsubscribing from auth state changes");
        authSubscription.current.unsubscribe();
        authSubscription.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  // Handle auth actions (OAuth or navigation)
  const handleAuth = useMemo(() => async (nextPath = '/') => {
    try {
      console.log("[AUTH] handleAuth called with nextPath:", nextPath);
      
      // If user is already logged in, navigate directly
      if (user) {
        console.log("[AUTH] User already logged in, navigating to:", nextPath);
        // Use window.location for navigation to avoid useNavigate issues
        window.location.href = nextPath;
        return;
      }
      
      // Store the redirect path for after login
      localStorage.setItem('postLoginRedirect', nextPath);
      
      // Always initiate OAuth for new sign-ins with account picker
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
        console.error("[AUTH] OAuth error:", error);
        throw error;
      }

      console.log("[AUTH] OAuth initiated successfully with account picker");
    } catch (error) {
      console.error("[AUTH] Auth error:", error);
      // Clear the redirect path on error
      localStorage.removeItem('postLoginRedirect');
    }
  }, [user]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({ 
    user, 
    loading, 
    handleAuth,
    isAuthenticated: !!user 
  }), [user, loading, handleAuth]);

  // Render children immediately without loading screen
  console.log("[AUTH] Rendering children immediately, user:", !!user);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
