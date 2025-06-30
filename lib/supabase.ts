import { createClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.warn('NEXT_PUBLIC_SUPABASE_URL environment variable is missing. Please check your environment configuration.')
}

if (!supabaseAnonKey) {
  console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is missing. Please check your environment configuration.')
}

// Standardized storage key for all clients
const STORAGE_KEY = 'clickmemory-auth'

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production'

// Global session management to prevent conflicts
let globalSession: Session | null = null
let sessionPromise: Promise<Session | null> | null = null
let sessionCacheTime: number = 0
const SESSION_CACHE_DURATION = 5000 // 5 seconds cache

// Only create clients if required environment variables are available
export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,
    storageKey: STORAGE_KEY,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Production-specific settings
    ...(isProduction && {
      cookieOptions: {
        name: STORAGE_KEY,
        lifetime: 60 * 60 * 8, // 8 hours
        domain: process.env.NEXT_PUBLIC_DOMAIN || undefined,
        path: '/',
        sameSite: 'lax',
        secure: true
      }
    })
  }
}) : null

// Server-side admin client for API routes with same storage key for consistency
export const supabaseAdmin = supabaseUrl && (supabaseServiceKey || supabaseAnonKey) ? createClient(
  supabaseUrl!,
  (supabaseServiceKey || supabaseAnonKey)!,
  {
    auth: {
      persistSession: false,
      storageKey: STORAGE_KEY,
      autoRefreshToken: false
    }
  }
) : null

// Unified session management functions
export const getSession = async () => {
  if (!supabase) return null
  
  // Check if we have a cached session that's still valid
  const now = Date.now()
  if (globalSession && globalSession.access_token && (now - sessionCacheTime) < SESSION_CACHE_DURATION) {
    return globalSession
  }
  
  // If we already have a session promise, wait for it
  if (sessionPromise) {
    try {
      const result = await sessionPromise
      return result
    } catch (error) {
      console.error('Session promise failed:', error)
      sessionPromise = null
    }
  }
  
  // Create new session promise
  
  // Create a promise that handles the session fetching
  const sessionFetchPromise = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting session:', error)
        return null
      }
      
      // Check if session exists but has no access token or is expired
      if (session) {
        const nowUnix = Math.floor(now / 1000)
        const expiresAt = session.expires_at
        
        // If session is expired or has no access token, try to refresh it
        if (!session.access_token || (expiresAt && nowUnix >= expiresAt)) {
          try {
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
            if (refreshError) {
              console.error('Error refreshing session:', refreshError)
              return null
            }
            if (refreshedSession) {
              globalSession = refreshedSession
              sessionCacheTime = now
              return refreshedSession
            }
          } catch (refreshError) {
            console.error('Session refresh failed:', refreshError)
            return null
          }
        }
      }
      
      globalSession = session
      sessionCacheTime = now
      return session
    } catch (error) {
      console.error('Session fetch failed:', error)
      return null
    }
  }
  
  // Create the promise and store it
  sessionPromise = sessionFetchPromise()
  
  try {
    const result = await sessionPromise
    // Only clear the promise after we've resolved it
    sessionPromise = null
    return result
  } catch (error) {
    console.error('Session promise failed:', error)
    sessionPromise = null
    return null
  }
}

export const refreshSession = async () => {
  if (!supabase) return null
  
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession()
    if (error) {
      console.error('Error refreshing session:', error)
      return null
    }
    
    globalSession = session
    return session
  } catch (error) {
    console.error('Session refresh failed:', error)
    return null
  }
}

export const clearSession = () => {
  globalSession = null
  sessionPromise = null
  sessionCacheTime = 0
} 