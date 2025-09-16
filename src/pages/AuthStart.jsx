import { useEffect } from "react";
import { supabase } from "../lib/supabase/browser";

export default function AuthStart() {
  useEffect(() => {
    const redirectTo = `${window.location.origin}/auth/callback`;
    supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  }, []);
  return <div style={{ padding: 24, fontSize: 16 }}>Redirecting to Google…</div>;
}
