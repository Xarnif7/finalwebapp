import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Auth() {
  useEffect(() => {
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  }, []);
  return <div style={{ padding: 24, fontSize: 16 }}>Redirecting to Google…</div>;
}
