import { createClient } from '@supabase/supabase-js';

// Global singleton instance
let supabaseClient: ReturnType<typeof createClient> | null = null;

// Simple environment variable helper
function getPublicEnv() {
  // Debug all available env vars
  console.log('[ENV DEBUG] All import.meta.env keys:', Object.keys(import.meta.env));
  console.log('[ENV DEBUG] VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('[ENV DEBUG] VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
  console.log('[ENV DEBUG] VITE_SITE_URL:', import.meta.env.VITE_SITE_URL);
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xvzkrctudezyasinskyo.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const siteUrl = import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  console.log('[ENV DEBUG] Resolved SUPABASE_URL:', supabaseUrl);
  console.log('[ENV DEBUG] Resolved SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
  console.log('[ENV DEBUG] Resolved SITE_URL:', siteUrl);

  return {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseAnonKey,
    SITE_URL: siteUrl,
  };
}

// No-op shim for when env vars are missing
const createNoOpSupabaseClient = () => ({
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithOAuth: () => Promise.resolve({ data: { provider: null, url: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
  },
  from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
});

export function getSupabaseClient() {
  // Return existing client if already created
  if (supabaseClient) {
    return supabaseClient;
  }

  // Use hardcoded values temporarily to get OAuth working
  const supabaseUrl = 'https://xvzkrctudezyasinskyo.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2emtyY3R1ZGV6eWFzaW5za3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NzMwMDEsImV4cCI6MjA3MDQ0OTAwMX0.G87uRFAUhLuXLrLBf3qSepEwFE2DSxs1Sh2AC5m0zaA';

  console.log('[SUPABASE DEBUG] Using hardcoded values:');
  console.log('[SUPABASE DEBUG] SUPABASE_URL:', supabaseUrl);
  console.log('[SUPABASE DEBUG] SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');

  // Create singleton client with unique storage key
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'blipp-auth-v1', // Unique storage key to prevent conflicts
    },
  });

  _supabaseUrl = supabaseUrl;

  return supabaseClient;
}

// Export the singleton client (lazy-loaded)
let _supabase: ReturnType<typeof createClient> | null = null;
let _supabaseUrl: string = '';

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    // Use existing client if available
    if (!_supabase) {
      _supabase = getSupabaseClient();
    }
    return _supabase[prop as keyof typeof _supabase];
  }
});

// Export supabaseUrl for debugging
export const getSupabaseUrl = () => {
  if (!_supabaseUrl) {
    const { SUPABASE_URL } = getPublicEnv();
    _supabaseUrl = SUPABASE_URL;
  }
  return _supabaseUrl;
};