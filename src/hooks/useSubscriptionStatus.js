import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiClient } from "../lib/apiClient";
import { supabase } from "../lib/supabase/browser";

// Subscription status hook that checks the API endpoint
export function useSubscriptionStatus(options = {}) {
  const { user, status: authStatus } = useAuth();
  const isAuthenticated = authStatus === 'signedIn';
  const [status, setStatus] = useState({ active: false, status: 'none', plan_tier: null, onboarding_completed: false, loading: true });
  const lastCheck = useRef(0);
  const lastUserId = useRef(null);
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes - increased for better user experience
  const requestTimeout = useRef(null);
  const inFlightRef = useRef(false);
  const abortControllerRef = useRef(null);

  // Memoize options to prevent unnecessary re-renders
  const memoizedOptions = useRef(options);
  const forceRefresh = options.force;

  useEffect(() => {
    // Only log once per navigation, not on every render
    if (!inFlightRef.current) {
      console.log('[SUBSCRIPTION] Hook triggered with:', { user: !!user, isAuthenticated, userId: user?.id });
    }
    
    // Clear any existing timeout and abort controller
    if (requestTimeout.current) {
      clearTimeout(requestTimeout.current);
      requestTimeout.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Only check if user is authenticated
    if (!isAuthenticated || !user) {
      setStatus(prev => {
        const newStatus = { active: false, status: 'none', plan_tier: null, onboarding_completed: false, loading: false };
        // Only update if state actually changed
        return JSON.stringify(prev) === JSON.stringify(newStatus) ? prev : newStatus;
      });
      return;
    }

    // Check if we need to refresh the cache (user changed or cache expired)
    const now = Date.now();
    const userChanged = lastUserId.current !== user.id;
    
    if (!forceRefresh && !userChanged && now - lastCheck.current < CACHE_DURATION) {
      return;
    }
    
    if (userChanged || forceRefresh) {
      lastCheck.current = 0;
    }

    // Prevent multiple simultaneous requests
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    abortControllerRef.current = new AbortController();

    const checkSubscription = async () => {
      try {
        setStatus(prev => ({ ...prev, loading: true }));
        
        // Set a shorter timeout for the entire request
        const timeoutPromise = new Promise((_, reject) => {
          requestTimeout.current = setTimeout(() => {
            reject(new Error('Request timeout'));
          }, 1500); // 1.5 second timeout - reduced for faster response
        });
        
        // Get the current session token
        const sessionPromise = supabase.auth.getSession();
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (!session) {
          throw new Error('No active session');
        }
        
        // Call the local subscription status API with auth token
        let endpoint = 'http://localhost:3001/api/subscription/status';
        if (forceRefresh) {
          endpoint += `?t=${Date.now()}`; // Add timestamp to bypass cache
        }
        
        const apiPromise = fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          signal: abortControllerRef.current.signal
        }).then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        });
        
        const data = await Promise.race([apiPromise, timeoutPromise]);
        
        const newStatus = { 
          active: data.active, 
          status: data.status, 
          plan_tier: data.plan_tier, 
          onboarding_completed: data.onboarding_completed || false,
          loading: false 
        };
        
        setStatus(prev => {
          // Only update if state actually changed
          return JSON.stringify(prev) === JSON.stringify(newStatus) ? prev : newStatus;
        });
        
        lastCheck.current = Date.now();
        lastUserId.current = user.id;
        
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        // Fallback to default if API fails - ensure loading is false
        const newStatus = { active: false, status: 'none', plan_tier: null, onboarding_completed: false, loading: false };
        setStatus(prev => {
          // Only update if state actually changed
          return JSON.stringify(prev) === JSON.stringify(newStatus) ? prev : newStatus;
        });
        lastCheck.current = Date.now();
        lastUserId.current = user.id;
      } finally {
        // Clear timeout and reset in-flight flag
        if (requestTimeout.current) {
          clearTimeout(requestTimeout.current);
          requestTimeout.current = null;
        }
        inFlightRef.current = false;
        abortControllerRef.current = null;
      }
    };

    // Add a very short safety timeout to prevent getting stuck loading
    const safetyTimeoutId = setTimeout(() => {
      setStatus(prev => ({ ...prev, loading: false }));
      inFlightRef.current = false;
    }, 2000); // 2 second safety timeout - very short for quick response

    checkSubscription();

    return () => {
      clearTimeout(safetyTimeoutId);
      if (requestTimeout.current) {
        clearTimeout(requestTimeout.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      inFlightRef.current = false;
    };
  }, [user?.id, isAuthenticated, forceRefresh]); // Only depend on stable values

  // Additional safety check - if we've been loading for too long, force it to false
  useEffect(() => {
    if (status.loading) {
      const safetyTimeout = setTimeout(() => {
        setStatus(prev => ({ ...prev, loading: false }));
      }, 2500); // 2.5 second safety timeout - very short for quick response
      
      return () => clearTimeout(safetyTimeout);
    }
  }, [status.loading]);
  
  return status;
}
