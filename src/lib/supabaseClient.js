import { createClient } from "@supabase/supabase-js";

// Validate required environment variables
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  const error = `[SUPABASE] Missing required environment variables:
  VITE_SUPABASE_URL: ${url ? '✓' : '✗'}
  VITE_SUPABASE_ANON_KEY: ${anon ? '✓' : '✗'}
  
  Please check your .env.local file and ensure both variables are set.`;
  console.error(error);
  throw new Error(error);
}

// Validate URL format
if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
  const error = `[SUPABASE] Invalid VITE_SUPABASE_URL: ${url}
  Expected format: https://[project-id].supabase.co`;
  console.error(error);
  throw new Error(error);
}

// Create singleton Supabase client
export const supabase = createClient(url, anon, {
  auth: { 
    persistSession: true, 
    flowType: "pkce",
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
});

// Remove global window assignment for security
// if (typeof window !== "undefined") window.supabase = supabase;

console.log(`[SUPABASE] Client initialized with project: ${url}`);
