'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { identifyUser, trackEvent } from '@/lib/posthog'

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
  const [lastRefreshTime, setLastRefreshTime] = useState(0)

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
    let isMounted = true
    let timeoutId: NodeJS.Timeout
    let refreshIntervalId: NodeJS.Timeout

    const initializeAuth = async () => {
      try {
        // Check if supabase client is available
        if (!supabase) {
          console.error('Supabase client not initialized - missing environment variables')
          if (isMounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }

        // Set a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Auth timeout')), 10000)
        })

        // Get initial session with timeout
        const sessionPromise = supabase.auth.getSession()
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any
        
        if (!isMounted) return

        console.log('AuthContext: Session loaded:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          expiresAt: session?.expires_at,
          expiresIn: session?.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000) : null
        })

        const currentUser = session?.user ?? null
        setUser(currentUser)
        setLoading(false)
        
        // Track user identification
        if (currentUser) {
          identifyUser(currentUser.id, currentUser.email)
          trackEvent('user_logged_in', {
            userId: currentUser.id,
            email: currentUser.email
          })
          
          // Check if session is close to expiring and refresh if needed
          if (session?.expires_at) {
            const expiresAt = session.expires_at
            const now = Math.floor(Date.now() / 1000)
            const timeUntilExpiry = expiresAt - now
            
            // Temporarily disable aggressive refresh to debug the issue
            // if (timeUntilExpiry < 300 && timeSinceLastRefresh > 30) {
            //   console.log('Session close to expiry, refreshing...')
            //   try {
            //     setLastRefreshTime(now)
            //     await supabase.auth.refreshSession()
            //   } catch (refreshError) {
            //     console.error('Initial session refresh failed:', refreshError)
            //   }
            // }
          }
          
          // Don't await this to prevent blocking
          checkPendingShares(currentUser).catch(error => {
            console.error('Error checking pending shares:', error)
          })
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (isMounted) {
          setUser(null)
          setLoading(false)
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
      }
    }

    initializeAuth()

    // Set up periodic session refresh (every 5 minutes instead of 10)
    const setupSessionRefresh = () => {
      if (supabase) {
        refreshIntervalId = setInterval(async () => {
          try {
            if (!supabase) return
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token && session.expires_at) {
              const expiresAt = session.expires_at
              const now = Math.floor(Date.now() / 1000)
              const timeUntilExpiry = expiresAt - now
              
              // Temporarily disable periodic refresh to debug the issue
              // const timeSinceLastRefresh = now - lastRefreshTime
              // if (timeUntilExpiry < 300 && timeSinceLastRefresh > 30) {
              //   console.log('Refreshing session...')
              //   setLastRefreshTime(now)
              //   await supabase.auth.refreshSession()
              // }
            } else if (!session?.access_token) {
              // No session, redirect to login
              console.log('No session found, redirecting to login')
              setUser(null)
              if (typeof window !== 'undefined') {
                window.location.href = '/auth'
              }
            }
          } catch (error) {
            console.error('Session refresh failed:', error)
            // If refresh fails, clear user and redirect to login
            setUser(null)
            if (typeof window !== 'undefined') {
              window.location.href = '/auth'
            }
          }
        }, 300000) // 5 minutes (more frequent)
      }
    }

    setupSessionRefresh()

    // Handle page visibility changes (tab switching)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && supabase) {
        try {
          // Check session when user returns to tab
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token && session.expires_at) {
            const expiresAt = session.expires_at
            const now = Math.floor(Date.now() / 1000)
            const timeUntilExpiry = expiresAt - now
            
            // Temporarily disable tab switch refresh to debug the issue
            // const timeSinceLastRefresh = now - lastRefreshTime
            // if (timeUntilExpiry < 300 && timeSinceLastRefresh > 30) {
            //   console.log('Refreshing session after tab switch...')
            //   setLastRefreshTime(now)
            //   await supabase.auth.refreshSession()
            // }
          }
        } catch (error) {
          console.error('Session refresh after tab switch failed:', error)
        }
      }
    }

    // Add page visibility listener
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Listen for auth changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!isMounted) return
          
          const newUser = session?.user ?? null
          
          // Only update user state if it actually changed
          if (newUser?.id !== user?.id) {
            setUser(newUser)
          }
          
          // Only set loading to false on initial load or sign out
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
            setLoading(false)
          }

          if (event === 'SIGNED_IN' && newUser) {
            identifyUser(newUser.id, newUser.email)
            trackEvent('user_logged_in', {
              userId: newUser.id,
              email: newUser.email
            })
            // Don't await this to prevent blocking
            checkPendingShares(newUser).catch(error => {
              console.error('Error checking pending shares:', error)
            })
          } else if (event === 'SIGNED_OUT') {
            trackEvent('user_logged_out')
          } else if (event === 'TOKEN_REFRESHED' && newUser) {
            // Session was refreshed successfully - don't trigger any state changes
            console.log('Session refreshed successfully')
          }
        }
      )

      return () => {
        isMounted = false
        if (timeoutId) clearTimeout(timeoutId)
        if (refreshIntervalId) clearInterval(refreshIntervalId)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        subscription.unsubscribe()
      }
    } else {
      return () => {
        isMounted = false
        if (timeoutId) clearTimeout(timeoutId)
        if (refreshIntervalId) clearInterval(refreshIntervalId)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [])

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
      // Force redirect to /auth after sign out
      if (typeof window !== 'undefined') {
        window.location.href = '/auth'
      }
    } catch (error) {
      console.error('AuthContext: Failed to sign out:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, pendingSharesAccepted, clearPendingSharesNotification, checkPendingShares: triggerCheckPendingShares }}>
      {children}
    </AuthContext.Provider>
  )
} 