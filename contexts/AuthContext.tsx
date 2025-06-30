'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, getSession, clearSession } from '@/lib/supabase'
import { trackEvent } from '@/lib/posthog'

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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
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

    // Get initial session using simplified session management
    const getInitialSession = async () => {
      try {
        const session = await getSession()
        if (session) {
          setUser(session.user)
          setSession(session)
        }
        setLoading(false)
        setAuthLoading(false)
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
          console.log('Auth state change:', event, session ? 'has session' : 'no session')
          
          if (event === 'SIGNED_IN' && session) {
            setUser(session.user)
            setSession(session)
            setLoading(false)
            setAuthLoading(false)
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
          } else if (event === 'USER_UPDATED' && session) {
            setUser(session.user)
            setSession(session)
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

      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('AuthContext: Error during sign out:', error)
        throw error
      }
      
      // Track sign out
      trackEvent('user_logged_out')
      
      // Clear session data
      clearSession()
    } catch (error) {
      console.error('AuthContext: Failed to sign out:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, session, signOut, pendingSharesAccepted, clearPendingSharesNotification, checkPendingShares: triggerCheckPendingShares }}>
      {children}
    </AuthContext.Provider>
  )
} 