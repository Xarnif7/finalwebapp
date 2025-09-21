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
        // Handle the OAuth callback explicitly
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthCallback] Auth error:', error);
          hasRedirected.current = true;
          navigate('/', { replace: true });
          return;
        }

        if (data.session && data.session.user) {
          console.log('[AuthCallback] User authenticated:', data.session.user.email);
          
          // Get next destination from query params, default to '/'
          const next = searchParams.get('next') || '/';
          
          hasRedirected.current = true;
          
          // Small delay to ensure session is fully established
          setTimeout(() => {
            navigate(next, { replace: true });
          }, 100);
          
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
