import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const url = new URL(window.location.href);
    const error = url.searchParams.get('error');
    
    if (error) {
      console.warn('[OAuth] error:', url.searchParams.toString());
      // Clear query, send to landing
      navigate('/', { replace: true });
      return;
    }

    (async () => {
      try {
        await supabase.auth.exchangeCodeForSession(window.location.href);
      } catch (e) {
        console.error('[OAuth] exchange failed', e);
      } finally {
        const dest = localStorage.getItem('postLoginRedirect') || '/dashboard';
        localStorage.removeItem('postLoginRedirect');
        // Replace history (no flicker / no lingering query string)
        navigate(dest, { replace: true });
      }
    })();
  }, [navigate]);

  // Return a blank white screen to eliminate any flash
  return (
    <div className="fixed inset-0 bg-white z-50">
      {/* Completely blank - no flash */}
    </div>
  );
}
