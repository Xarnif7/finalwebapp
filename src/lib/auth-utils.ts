import { supabase, getSupabaseUrl } from './supabase/browser';

// Simple environment variable helper
function getPublicEnv() {
  const siteUrl = import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return { SITE_URL: siteUrl };
}

// Centralized OAuth sign-in handler
export async function signInWithGoogle(): Promise<void> {
  const siteUrl = getPublicEnv().SITE_URL;
  const supabaseUrl = getSupabaseUrl();
  const redirectTo = `${siteUrl}/auth/callback`;

  // Debug logging for both dev and production
  console.log(`[OAUTH] Environment: ${import.meta.env.MODE}`);
  console.log(`[OAUTH] VITE_SITE_URL: ${import.meta.env.VITE_SITE_URL}`);
  console.log(`[OAUTH] Resolved siteUrl: ${siteUrl}`);
  console.log(`[OAUTH] redirectTo: ${redirectTo}`);
  console.log(`[OAUTH] supabaseUrl: ${supabaseUrl}`);

  try {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account'
        }
      }
    });
  } catch (error: any) {
    const errorMessage = error?.message || '';

    // Show toast with error message
    if (import.meta.env.DEV) {
      console.error(`[OAUTH ERROR] ${errorMessage}`);
      console.error(`[OAUTH DEBUG] provider='google' redirectTo=${redirectTo} supabaseUrl=${supabaseUrl}`);
    }

    alert(`OAuth Error: ${errorMessage}`);
  }
}

// Centralized switch account handler
export async function switchAccount(): Promise<void> {
  try {
    // Sign out first
    await supabase.auth.signOut();
    
    // Then sign in with Google (same as sign in)
    await signInWithGoogle();
  } catch (error) {
    console.error('Error switching account:', error);
  }
}

// OAuth smoke test helper (dev only)
export function oauthSmokeTest(): string {
  const siteUrl = import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const supabaseUrl = getSupabaseUrl();
  const redirectTo = encodeURIComponent(`${siteUrl}/auth/callback`);

  return `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
}
