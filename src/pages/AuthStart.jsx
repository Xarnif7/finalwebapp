import { useEffect } from "react";
import { signInWithGoogle } from "../lib/auth-utils";

export default function AuthStart() {
  useEffect(() => {
    signInWithGoogle();
  }, []);
  return <div style={{ padding: 24, fontSize: 16 }}>Redirecting to Google…</div>;
}
