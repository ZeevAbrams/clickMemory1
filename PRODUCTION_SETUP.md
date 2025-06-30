# Production Setup Guide

## Environment Variables for Vercel

Add these environment variables in your Vercel project settings:

### Required Variables
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Optional Variables (for better production handling)
```
NEXT_PUBLIC_DOMAIN=click-memory.vercel.app
```

## Production-Specific Changes Made

1. **Cookie Settings**: Added production-specific cookie options with:
   - `secure: true` (HTTPS only)
   - `sameSite: 'lax'` (CSRF protection)
   - `domain` (if NEXT_PUBLIC_DOMAIN is set)
   - `path: '/'` (available across the site)

2. **Session Persistence**: Enhanced session handling for production environments

3. **Error Recovery**: Added fallback mechanisms for sign-out and authentication failures

4. **Timeout Protection**: Added timeout handling to prevent hanging requests

## Troubleshooting Production Issues

### If you still get 401 errors:
1. Check that all environment variables are set correctly in Vercel
2. Verify that your Supabase project is in the same region as your Vercel deployment
3. Check that your domain is properly configured in Supabase Auth settings

### If sign-out doesn't work:
1. The app will now force redirect to `/auth` even if the sign-out API call fails
2. Session data is cleared from localStorage in production

### If sessions don't persist:
1. Check that `NEXT_PUBLIC_DOMAIN` is set correctly
2. Verify that your Supabase project allows your domain in the Auth settings 