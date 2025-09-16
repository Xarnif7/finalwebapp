# Auth Setup

## Overview
This application uses a singleton Supabase client pattern with a safe AuthProvider to prevent "Multiple GoTrueClient instances" warnings and "useAuth must be used within an AuthProvider" crashes.

## Architecture

### Singleton Supabase Client
- **File**: `src/lib/supabase/browser.ts`
- **Pattern**: Global singleton with unique storage key
- **Storage Key**: `blipp-auth-v1` (prevents conflicts)
- **Configuration**: 
  - `persistSession: true`
  - `autoRefreshToken: true`
  - `detectSessionInUrl: true`

### Safe AuthProvider
- **File**: `src/components/auth/AuthProvider.tsx`
- **Behavior**: Never throws when used outside context
- **Fallback**: Returns `{status: 'signedOut', user: null, session: null}` when no context found
- **Features**:
  - Single `onAuthStateChange` subscription
  - Automatic cleanup on unmount
  - Custom events for component re-rendering

### Provider Placement
- **Dashboard Routes**: Wrapped with `<AuthProvider>` in `src/pages/index.jsx`
- **Marketing Routes**: No AuthProvider wrapper (uses safe fallback)
- **Result**: Marketing pages remain independent, dashboard gets full auth context

### Safe useAuth Hook
- **Location**: `src/components/auth/AuthProvider.tsx`
- **Behavior**: 
  - Returns auth state when inside provider
  - Returns safe fallback when outside provider
  - Logs warning but never crashes

## Key Benefits
1. **No Multiple Client Warnings**: Single Supabase instance across entire app
2. **No Context Crashes**: Safe fallback prevents "must be used within provider" errors
3. **Marketing Independence**: Landing pages work without auth context
4. **Dashboard Reactivity**: Header and components update immediately on auth changes
5. **Clean Console**: No auth-related errors or warnings

## Usage
```tsx
// Safe to use anywhere - won't crash
const { status, user, session } = useAuth();

// Status values: 'loading' | 'signedOut' | 'signedIn'
// When outside provider: status = 'signedOut', user = null, session = null
```

## Post-Auth Routing
- **Callback**: `src/pages/AuthCallback.jsx` uses `window.location.href` for full page refresh
- **Guards**: Route guards in `src/components/auth/RouteGuards.tsx` handle redirects
- **Result**: Immediate UI updates after login/logout
