import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const handleAuthCallback = async () => {
      try {
        console.log('[AuthCallback] Starting OAuth callback handling...');
        
        // Wait a moment for the OAuth flow to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check for session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('[AuthCallback] Session check result:', { 
          hasSession: !!session, 
          error: error?.message,
          user: session?.user?.email 
        });
        
        if (error) {
          console.error('[AuthCallback] Session error:', error);
          navigate('/', { replace: true });
          return;
        }

        if (session && session.user) {
          console.log('[AuthCallback] Successfully authenticated, redirecting...');
          const dest = localStorage.getItem('postLoginRedirect') || '/reporting';
          localStorage.removeItem('postLoginRedirect');
          navigate(dest, { replace: true });
        } else {
          console.log('[AuthCallback] No valid session, redirecting to landing...');
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('[AuthCallback] Unexpected error:', error);
        navigate('/', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  // Return a blank white screen to eliminate any flash
  return (
    <div className="fixed inset-0 bg-white z-50">
      {/* Completely blank - no flash */}
    </div>
  );
}
