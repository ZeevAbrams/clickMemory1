'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, getSession, clearSession } from '@/lib/supabase'
import { trackEvent } from '@/lib/posthog'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  pendingSharesAccepted: number
  clearPendingSharesNotification: () => void
  checkPendingShares: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  pendingSharesAccepted: 0,
  clearPendingSharesNotification: () => {},
  checkPendingShares: async () => {}
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingSharesAccepted, setPendingSharesAccepted] = useState(0)
  const [authLoading, setAuthLoading] = useState(true)

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
        .eq('email', user.email)

      if (error) {
        console.error('Error fetching pending shares:', error)
        return
      }

      if (pendingShares && pendingShares.length > 0) {
        let acceptedCount = 0
        
        // Process each pending share
        for (const pendingShare of pendingShares) {
          try {
            // Check if invitation hasn't expired
            if (pendingShare.expires_at && new Date(pendingShare.expires_at) < new Date()) {
              continue
            }

            // Create actual share
            const { error: shareError } = await supabase
              .from('shared_snippets')
              .insert([{
                snippet_id: pendingShare.snippet_id,
                shared_with_user_id: user.id,
                permission: pendingShare.permission || 'view'
              }])

            if (shareError) {
              console.error('Error creating share from pending:', shareError)
              continue
            }

            // Delete pending share
            const { error: deleteError } = await supabase
              .from('pending_shares')
              .delete()
              .eq('id', pendingShare.id)

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
    if (!supabase) return

    // Get initial session using unified session management
    const getInitialSession = async () => {
      try {
        const session = await getSession()
        if (session && session.access_token) {
          setUser(session.user)
          setLoading(false)
          setAuthLoading(false)
        } else {
          setLoading(false)
          setAuthLoading(false)
        }
      } catch (error) {
        console.error('AuthContext: Error in getInitialSession:', error)
        setLoading(false)
        setAuthLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session && session.access_token) {
            setUser(session.user)
            setLoading(false)
            setAuthLoading(false)
          } else if (event === 'SIGNED_OUT') {
            setUser(null)
            setLoading(false)
            setAuthLoading(false)
            // Clear unified session management
            clearSession()
            // Clear any stored session data
            if (typeof window !== 'undefined') {
              localStorage.removeItem('clickmemory-auth')
              sessionStorage.clear()
            }
          } else if (event === 'TOKEN_REFRESHED' && session && session.access_token) {
            setUser(session.user)
            setLoading(false)
            setAuthLoading(false)
          } else if (event === 'USER_UPDATED' && session && session.access_token) {
            setUser(session.user)
            setLoading(false)
            setAuthLoading(false)
          }
        }
      )

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [supabase])

  const signOut = async () => {
    try {
      if (!supabase) {
        console.error('Supabase client not available for sign out')
        throw new Error('Authentication service not available')
      }

      // In production, try to clear session more aggressively
      const isProduction = process.env.NODE_ENV === 'production'
      
      if (isProduction) {
        // Clear any stored session data first
        if (typeof window !== 'undefined') {
          localStorage.removeItem('clickmemory-auth')
          sessionStorage.clear()
        }
      }

      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('AuthContext: Error during sign out:', error)
        // In production, force redirect even if signOut fails
        if (isProduction && typeof window !== 'undefined') {
          window.location.href = '/auth'
          return
        }
        throw error
      }
      // Track sign out
      trackEvent('user_logged_out')
      // Force redirect to /auth after sign out
      if (typeof window !== 'undefined') {
        window.location.href = '/auth'
      }
    } catch (error) {
      console.error('AuthContext: Failed to sign out:', error)
      // In production, force redirect even on error
      if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
        window.location.href = '/auth'
        return
      }
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, pendingSharesAccepted, clearPendingSharesNotification, checkPendingShares: triggerCheckPendingShares }}>
      {children}
    </AuthContext.Provider>
  )
} 