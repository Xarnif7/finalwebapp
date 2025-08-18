import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) throw error;
        navigate("/dashboard", { replace: true });
      } catch (e) {
        console.error("Auth callback failed:", e);
        navigate("/", { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div style={{display:"grid",placeItems:"center",minHeight:"60vh"}}>
      <div>Completing sign in…</div>
    </div>
  );
}
