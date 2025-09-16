import { createClient } from '@supabase/supabase-js';

// Global singleton instance
let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is missing. Please check your environment variables.');
  }

  if (!supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY is missing. Please check your environment variables.');
  }

  // Validate URL format
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    throw new Error(`Invalid VITE_SUPABASE_URL: ${supabaseUrl}. Expected format: https://[project-id].supabase.co`);
  }

  // Create singleton client with unique storage key
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'blipp-auth-v1', // Unique storage key to prevent conflicts
    },
  });

  console.log(`[SUPABASE] Singleton client initialized with project: ${supabaseUrl}`);
  return supabaseClient;
}

// Export the singleton client
export const supabase = getSupabaseClient();
