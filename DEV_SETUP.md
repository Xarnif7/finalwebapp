# Development Setup Guide

## Quick Start

1. **Set up environment variables:**
   ```bash
   # Edit .env.local with your Supabase credentials
   VITE_SUPABASE_URL=your_actual_supabase_url
   VITE_SUPABASE_ANON_KEY=your_actual_anon_key
   VITE_APP_BASE_URL=http://localhost:5173
   ```

2. **Start the dev server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   ```
   http://localhost:5173
   ```

## Common Issues & Solutions

### Issue: "useAuth used outside AuthProvider"
- **Solution:** The marketing routes are now wrapped with AuthProvider in `src/pages/index.jsx`
- **Check:** Make sure you're not importing `useAuth` in components outside the provider

### Issue: Base44 redirects
- **Solution:** All base44 dependencies have been removed
- **Check:** No more `@base44/sdk` in package.json

### Issue: Environment variables not loading
- **Solution:** Make sure `.env.local` exists and has correct values
- **Check:** Restart the dev server after changing env vars

### Issue: Routing errors
- **Solution:** All routes are handled by React Router in `src/pages/index.jsx`
- **Check:** No conflicting route definitions

## Current OAuth Flow

1. User clicks "Sign in" → Supabase Google OAuth
2. Google redirects to `/auth/callback?next=/`
3. AuthCallback redirects to `/` (landing)
4. Header shows appropriate CTA based on auth state

## Testing the Flow

1. **Signed out:** Should see "Sign in" button only
2. **Click "Sign in":** Should open Google OAuth
3. **After OAuth:** Should return to landing with updated header
4. **Signed in (no sub):** Should see "Get Started" + avatar
5. **Signed in (with sub):** Should see "View Dashboard" + avatar

## Debug Commands

```bash
# Check for build errors
npm run build

# Check for linting errors
npm run lint

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```
