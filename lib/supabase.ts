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



// Create a singleton client to prevent multiple instances
let supabaseClient: ReturnType<typeof createClient> | null = null

// Only create clients if required environment variables are available
export const supabase = (() => {
  if (!supabaseUrl || !supabaseAnonKey) return null
  
  // Return existing client if already created
  if (supabaseClient) return supabaseClient
  
  // Create new client with Vercel-optimized settings
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: STORAGE_KEY,
      autoRefreshToken: true,
      detectSessionInUrl: false, // Disable to prevent conflicts
      flowType: 'pkce',
      // Remove cookie options that cause issues on Vercel
      // Let Supabase handle storage automatically
    }
  })
  
  return supabaseClient
})()

// Server-side admin client for API routes
export const supabaseAdmin = (() => {
  if (!supabaseUrl || !(supabaseServiceKey || supabaseAnonKey)) return null
  
  return createClient(
    supabaseUrl,
    (supabaseServiceKey || supabaseAnonKey)!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )
})()

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
    // Clear all potential storage locations
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.clear()
    
    // Also clear any Supabase-related items
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.includes('supabase') || key.includes('clickmemory')) {
        localStorage.removeItem(key)
      }
    })
  }
}

// Cleanup function for React 19 strict mode
export const cleanupSupabase = () => {
  if (supabaseClient) {
    // Remove auth state change listeners
    supabaseClient.auth.onAuthStateChange(() => {})
    supabaseClient = null
  }
}

// Reset function to clear singleton (useful for testing)
export const resetSupabase = () => {
  supabaseClient = null
} 