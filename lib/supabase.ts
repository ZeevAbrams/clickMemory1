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

// Simple session getter - let Supabase handle refresh automatically
export const getSession = async (): Promise<Session | null> => {
  if (!supabase) return null
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    return session
  } catch (error) {
    console.error('Session fetch failed:', error)
    return null
  }
}

// Simple session refresh - only use when explicitly needed
export const refreshSession = async (): Promise<Session | null> => {
  if (!supabase) return null
  
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession()
    if (error) {
      console.error('Error refreshing session:', error)
      return null
    }
    return session
  } catch (error) {
    console.error('Session refresh failed:', error)
    return null
  }
}

// Clear session data
export const clearSession = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.clear()
  }
} 