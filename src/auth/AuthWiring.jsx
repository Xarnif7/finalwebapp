import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const PROTECTED = ["/dashboard","/onboarding","/settings","/clients","/reviews","/conversations"];

export default function AuthWiring() {
  const navigate = useNavigate();
  const location = useLocation();
  const triggered = useRef(false);

  // If user opens a protected route while logged out, go straight to Google
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const path = location.pathname.toLowerCase();
      const needsAuth = PROTECTED.some(p => path.startsWith(p));
      if (alive && needsAuth && !session && !triggered.current) {
        triggered.current = true;
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback` }
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
        if (p === "/" || p.startsWith("/auth")) {
          navigate("/dashboard", { replace: true });
        }
      }
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, [location.pathname, navigate]);

  // Global CTA interceptor: if logged out -> Google; if logged in -> /dashboard
  useEffect(() => {
    const handler = async (e) => {
      const el = e.target.closest("[data-auth]");
      if (!el) return;

      e.preventDefault();
      e.stopPropagation();

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback` }
        });
      } else {
        navigate("/dashboard");
      }
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [navigate]);

  return null;
}
