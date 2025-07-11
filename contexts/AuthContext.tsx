'use client'
import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, Session, Subscription } from '@supabase/supabase-js'
import { useSupabase } from './SupabaseContext'
import { trackEvent, identifyUser } from '@/lib/posthog'
import type { PendingShare } from '@/types/database'

interface AuthContextType {
  user: User | null
  loading: boolean
  session: Session | null
  signOut: () => Promise<void>
  pendingSharesAccepted: number
  clearPendingSharesNotification: () => void
  checkPendingShares: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  session: null,
  signOut: async () => {},
  pendingSharesAccepted: 0,
  clearPendingSharesNotification: () => {},
  checkPendingShares: async () => {}
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { supabase, loading: supabaseLoading, getSession, refreshSession, clearSession, setupAutoRefresh } = useSupabase()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [pendingSharesAccepted, setPendingSharesAccepted] = useState(0)
  const [authLoading, setAuthLoading] = useState(true)
  const subscriptionRef = useRef<Subscription | null>(null)
  const mountedRef = useRef(false)

  // Check for pending shares when user signs up
  const checkPendingShares = async (user: User) => {
    try {
      if (!supabase) {
        console.error('Supabase client not available for checking pending shares')
        return
      }

      // Add a small delay to ensure user profile is fully created
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // First, let's check if the user exists in the profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        console.error('Profile not found or error:', profileError)
        return
      }

      // Get pending shares for this user's email
      const { data: pendingShares, error } = await supabase
        .from('pending_shares')
        .select('*')
        .eq('email', user.email || '')

      if (error) {
        console.error('Error fetching pending shares:', error)
        return
      }

      if (pendingShares && pendingShares.length > 0) {
        let acceptedCount = 0
        
        // Process each pending share
        for (const pendingShare of pendingShares) {
          try {
            // Type guard to ensure we have the required properties
            if (!pendingShare || typeof pendingShare !== 'object' || !('id' in pendingShare) || !('snippet_id' in pendingShare)) {
              console.error('Invalid pending share data:', pendingShare)
              continue
            }

            const share = pendingShare as unknown as PendingShare

            // Check if invitation hasn't expired
            if (share.expires_at && new Date(share.expires_at) < new Date()) {
              continue
            }

            // Create actual share
            const { error: shareError } = await supabase
              .from('shared_snippets')
              .insert([{
                snippet_id: share.snippet_id,
                shared_with_user_id: user.id,
                permission: share.permission || 'view'
              }])

            if (shareError) {
              console.error('Error creating share from pending:', shareError)
              continue
            }

            // Delete pending share
            const { error: deleteError } = await supabase
              .from('pending_shares')
              .delete()
              .eq('id', share.id)

            if (deleteError) {
              console.error('Error deleting pending share:', deleteError)
            }

            acceptedCount++
          } catch (error) {
            console.error('Error processing pending share:', error)
          }
        }

        // Set notification count
        if (acceptedCount > 0) {
          setPendingSharesAccepted(acceptedCount)
        }
      }
    } catch (error) {
      console.error('Error checking pending shares:', error)
    }
  }

  const clearPendingSharesNotification = () => {
    setPendingSharesAccepted(0)
  }

  const triggerCheckPendingShares = async () => {
    if (user) {
      await checkPendingShares(user)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!supabase || supabaseLoading) return

    // Get initial session using unified session management
    const getInitialSession = async () => {
      try {
        const session = await getSession()
        if (session && mountedRef.current) {
          setUser(session.user)
          setSession(session)
          // Set up auto-refresh for the session
          setupAutoRefresh(session)
          
          // Identify user in PostHog
          identifyUser(session.user.id, session.user.email || undefined, {
            email: session.user.email,
            created_at: session.user.created_at
          })
          
          // Track login
          trackEvent('user_logged_in', {
            userId: session.user.id,
            email: session.user.email
          })
        }
        if (mountedRef.current) {
          setLoading(false)
          setAuthLoading(false)
        }
      } catch (error) {
        console.error('AuthContext: Error in getInitialSession:', error)
        if (mountedRef.current) {
          setLoading(false)
          setAuthLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes - ONLY ONE subscription
    if (supabase && !subscriptionRef.current) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state change:', event, session ? 'has session' : 'no session')
          
          if (!mountedRef.current) return
          
          if (event === 'SIGNED_IN' && session) {
            setUser(session.user)
            setSession(session)
            setLoading(false)
            setAuthLoading(false)
            // Set up auto-refresh for new session
            setupAutoRefresh(session)
            
            // Identify user in PostHog
            identifyUser(session.user.id, session.user.email || undefined, {
              email: session.user.email,
              created_at: session.user.created_at
            })
            
            // Track login
            trackEvent('user_logged_in', {
              userId: session.user.id,
              email: session.user.email
            })
          } else if (event === 'SIGNED_OUT') {
            setUser(null)
            setSession(null)
            setLoading(false)
            setAuthLoading(false)
            clearSession()
          } else if (event === 'TOKEN_REFRESHED' && session) {
            setUser(session.user)
            setSession(session)
            setLoading(false)
            setAuthLoading(false)
            // Set up auto-refresh for refreshed session
            setupAutoRefresh(session)
          } else if (event === 'USER_UPDATED' && session) {
            setUser(session.user)
            setSession(session)
            setLoading(false)
            setAuthLoading(false)
            // Set up auto-refresh for updated session
            setupAutoRefresh(session)
          }
        }
      )

      subscriptionRef.current = subscription
    }

    // Cleanup function for React 19 strict mode
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [supabase, supabaseLoading, getSession, clearSession, setupAutoRefresh])

  const signOut = async () => {
    try {
      // Track sign out first (before any potential errors)
      trackEvent('user_logged_out')
      
      // Clear local state immediately
      setUser(null)
      setSession(null)
      setLoading(false)
      setAuthLoading(false)
      
      // Clear session data using unified function
      clearSession()
      
      // Try to sign out from Supabase if available
      if (supabase) {
        try {
          const { error } = await supabase.auth.signOut()
          if (error) {
            console.warn('AuthContext: Warning during sign out:', error)
            // Don't throw error - we've already cleared local state
          }
        } catch (signOutError) {
          console.warn('AuthContext: Warning during Supabase sign out:', signOutError)
          // Don't throw error - we've already cleared local state
        }
      }
      
      // Redirect to home page or login page
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (error) {
      console.error('AuthContext: Failed to sign out:', error)
      // Even if there's an error, try to clear local state
      setUser(null)
      setSession(null)
      setLoading(false)
      setAuthLoading(false)
      clearSession()
      
      // Redirect to home page
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, session, signOut, pendingSharesAccepted, clearPendingSharesNotification, checkPendingShares: triggerCheckPendingShares }}>
      {children}
    </AuthContext.Provider>
  )
} 