'use client'
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.warn('NEXT_PUBLIC_SUPABASE_URL environment variable is missing.')
}

if (!supabaseAnonKey) {
  console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is missing.')
}

// Standardized storage key
const STORAGE_KEY = 'clickmemory-auth'

// Global session cache to prevent multiple simultaneous requests
let globalSession: Session | null = null
let sessionPromise: Promise<{ data: { session: Session | null }, error: any }> | null = null

interface SupabaseContextType {
  supabase: SupabaseClient | null
  loading: boolean
  getSession: () => Promise<Session | null>
  refreshSession: () => Promise<Session | null>
  clearSession: () => void
  setupAutoRefresh: (session: Session | null) => void
}

const SupabaseContext = createContext<SupabaseContextType>({
  supabase: null,
  loading: true,
  getSession: async () => null,
  refreshSession: async () => null,
  clearSession: () => {},
  setupAutoRefresh: () => {}
})

export const useSupabase = () => useContext(SupabaseContext)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [loading, setLoading] = useState(true)
  const clientRef = useRef<SupabaseClient | null>(null)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check if token needs refresh
  const shouldRefreshToken = (session: Session | null): boolean => {
    if (!session?.access_token) return false
    
    // Refresh token if it expires in the next 5 minutes
    const expiresAt = session.expires_at
    if (!expiresAt) return false
    
    const now = Date.now()
    const expiresIn = expiresAt * 1000 - now
    return expiresIn < 5 * 60 * 1000 // 5 minutes
  }

  const refreshSession = useCallback(async (): Promise<Session | null> => {
    if (!clientRef.current) return null;
    
    try {
      console.log('Refreshing session...');
      const { data: { session }, error } = await clientRef.current.auth.refreshSession();
      if (error) {
        console.error('Error refreshing session:', error);
        return null;
      }
      globalSession = session;
      console.log('Session refreshed successfully');
      return session;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return null;
    }
  }, []);

  // Set up automatic token refresh
  const setupAutoRefresh = useCallback((session: Session | null) => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }
    
    if (!session?.access_token) return
    
    const expiresAt = session.expires_at
    if (!expiresAt) return
    
    const now = Date.now()
    const expiresIn = expiresAt * 1000 - now
    
    // Refresh 5 minutes before expiration
    const refreshIn = Math.max(expiresIn - 5 * 60 * 1000, 60 * 1000) // At least 1 minute
    
    refreshTimeoutRef.current = setTimeout(async () => {
      console.log('Auto-refreshing token...')
      await refreshSession()
    }, refreshIn)
  }, [refreshSession])

  // Unified session management functions
  const getSession = useCallback(async (): Promise<Session | null> => {
    if (!clientRef.current) return null
    
    // If we already have a session promise, wait for it
    if (sessionPromise) {
      try {
        const { data: { session } } = await sessionPromise
        return session
      } catch (error) {
        console.error('Error getting session from promise:', error)
        return null
      }
    }
    
    // Create new session promise
    sessionPromise = clientRef.current.auth.getSession()
    try {
      const { data: { session }, error } = await sessionPromise
      if (error) {
        console.error('Error getting session:', error)
        return null
      }
      
      // Check if token needs refresh
      if (session && shouldRefreshToken(session)) {
        console.log('Token expires soon, refreshing...')
        const refreshedSession = await refreshSession()
        globalSession = refreshedSession
        return refreshedSession
      }
      
      globalSession = session
      return session
    } catch (error) {
      console.error('Session fetch failed:', error)
      return null
    } finally {
      sessionPromise = null
    }
  }, [refreshSession])

  const clearSession = useCallback(() => {
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
      
      // Clear global session cache
      globalSession = null
      sessionPromise = null
      
      // Clear refresh timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    // Only create client if environment variables are available
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables')
      setLoading(false)
      return
    }

    // Create the Supabase client with Vercel-optimized settings
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: STORAGE_KEY,
        autoRefreshToken: true,
        detectSessionInUrl: false, // Disable to prevent conflicts
        flowType: 'pkce',
      }
    })

    clientRef.current = client
    setSupabase(client)
    setLoading(false)

    // Cleanup function
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  return (
    <SupabaseContext.Provider value={{ 
      supabase, 
      loading, 
      getSession, 
      refreshSession, 
      clearSession,
      setupAutoRefresh
    }}>
      {children}
    </SupabaseContext.Provider>
  )
} 