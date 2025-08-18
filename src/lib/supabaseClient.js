import { createClient } from "@supabase/supabase-js";

const url  = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) console.warn("[supabase] Missing env");

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, flowType: "pkce" },
});

if (typeof window !== "undefined") window.supabase = supabase;
