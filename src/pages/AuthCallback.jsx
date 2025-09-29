import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase/browser';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasRedirected = useRef(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Prevent multiple redirects
      if (hasRedirected.current) return;
      
      console.log('[AuthCallback] Starting callback handling...');
      console.log('[AuthCallback] URL params:', Object.fromEntries(searchParams.entries()));
      
      try {
        // Check if this is an OAuth callback with code/error parameters
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        
        if (error) {
          console.error('[AuthCallback] OAuth error:', error);
          const errorDescription = searchParams.get('error_description');
          console.error('[AuthCallback] Error description:', errorDescription);
          
          // Handle specific error cases
          if (error === 'server_error' && errorDescription?.includes('Database error saving new user')) {
            console.error('[AuthCallback] Database error during user creation - this should be fixed by the new trigger');
          }
          
          hasRedirected.current = true;
          navigate('/', { replace: true });
          return;
        }

        if (code) {
          console.log('[AuthCallback] Processing OAuth callback with code...');
          
          // Exchange the code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('[AuthCallback] Code exchange error:', exchangeError);
            hasRedirected.current = true;
            navigate('/', { replace: true });
            return;
          }

          if (data.session && data.session.user) {
            console.log('[AuthCallback] User authenticated via OAuth:', data.session.user.email);
            
            // Ensure user has proper setup (profile and business)
            try {
              const response = await fetch('/api/profile/ensure-setup', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${data.session.access_token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  email: data.session.user.email
                })
              });

              if (response.ok) {
                const setupResult = await response.json();
                console.log('[AuthCallback] User setup verified/created:', setupResult);
              } else {
                const errorText = await response.text();
                console.warn('[AuthCallback] User setup verification failed:', errorText);
              }
            } catch (setupError) {
              console.warn('[AuthCallback] User setup verification error:', setupError);
            }
            
            // Get next destination from query params, default to '/'
            const next = searchParams.get('next') || '/';
            
            hasRedirected.current = true;
            
            // Wait for session to be fully established before redirecting
            setTimeout(async () => {
              // Double-check that session is still valid
              const { data: { session: finalSession } } = await supabase.auth.getSession();
              if (finalSession && finalSession.user) {
                console.log('[AuthCallback] Session confirmed, redirecting to:', next);
                navigate(next, { replace: true });
              } else {
                console.error('[AuthCallback] Session lost during setup, redirecting to landing');
                navigate('/', { replace: true });
              }
            }, 500);
            return;
          }
        }

        // Fallback: check for existing session
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[AuthCallback] Session check error:', sessionError);
          hasRedirected.current = true;
          navigate('/', { replace: true });
          return;
        }

        if (data.session && data.session.user) {
          console.log('[AuthCallback] User authenticated via existing session:', data.session.user.email);
          
          // Get next destination from query params, default to '/'
          const next = searchParams.get('next') || '/';
          
          hasRedirected.current = true;
          
            // Wait for session to be fully established before redirecting
            setTimeout(async () => {
              // Double-check that session is still valid
              const { data: { session: finalSession } } = await supabase.auth.getSession();
              if (finalSession && finalSession.user) {
                console.log('[AuthCallback] Fallback session confirmed, redirecting to:', next);
                navigate(next, { replace: true });
              } else {
                console.error('[AuthCallback] Fallback session lost, redirecting to landing');
                navigate('/', { replace: true });
              }
            }, 500);
          
        } else {
          console.log('[AuthCallback] No valid session, redirecting to landing...');
          hasRedirected.current = true;
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('[AuthCallback] Error:', error);
        hasRedirected.current = true;
        navigate('/', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
