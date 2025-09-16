import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase/browser";

const PROTECTED = ["/dashboard","/onboarding","/settings","/clients","/reviews","/conversations","/customers","/automations","/reporting","/public-feedback"];

export default function AuthWiring() {
  const navigate = useNavigate();
  const location = useLocation();
  const triggered = useRef(false);

  // If user opens a protected route while logged out, go straight to Google
  useEffect(() => {
    let alive = true;
    (async () => {
      // Add a small delay to allow auth state to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: { session } } = await supabase.auth.getSession();
      const path = location.pathname.toLowerCase();
      const needsAuth = PROTECTED.some(p => path.startsWith(p));
      
      console.log('[AUTH_WIRING] Session check:', { 
        hasSession: !!session, 
        path, 
        needsAuth, 
        triggered: triggered.current 
      });
      
      if (alive && needsAuth && !session && !triggered.current) {
        triggered.current = true;
        console.log('[AUTH_WIRING] Redirecting to Google OAuth');
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { 
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent'
            }
          }
        });
      }
    })();
    return () => { alive = false; };
  }, [location.pathname]);

  // When we actually sign in, go to /dashboard if we're on "/" or any /auth* route
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        const p = location.pathname.toLowerCase();
        // Only redirect if we're on landing page or auth routes, not if already on dashboard/reporting
        if ((p === "/" || p.startsWith("/auth")) && p !== "/dashboard" && p !== "/reporting") {
          navigate("/reporting", { replace: true });
        }
      }
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, [location.pathname, navigate]);

  return null;
}
