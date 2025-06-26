'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

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

  // Check for pending shares when user signs up
  const checkPendingShares = async (user: User) => {
    try {
      console.log('=== CHECKING PENDING SHARES ===')
      console.log('User object:', user)
      console.log('User email:', user.email)
      console.log('User ID:', user.id)
      
      // Add a small delay to ensure user profile is fully created
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // First, let's check if the user exists in the profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('Profile lookup result:', { profile, profileError })

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

      console.log('Pending shares query result:', pendingShares)
      console.log('Query used email:', user.email)

      // Also try a broader search to see all pending shares (for debugging RLS)
      const { data: allPendingShares, error: allError } = await supabase
        .from('pending_shares')
        .select('*')

      console.log('All pending shares in database:', allPendingShares)
      console.log('All pending shares error:', allError)

      if (pendingShares && pendingShares.length > 0) {
        console.log('Found pending shares:', pendingShares.length)
        
        let acceptedCount = 0
        
        // Process each pending share
        for (const pendingShare of pendingShares) {
          try {
            console.log('Processing pending share:', pendingShare.id, 'for snippet:', pendingShare.snippet_id)
            
            // Check if invitation hasn't expired
            if (pendingShare.expires_at && new Date(pendingShare.expires_at) < new Date()) {
              console.log('Pending share expired, skipping:', pendingShare.id)
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

            console.log('Successfully created share for pending share:', pendingShare.id)

            // Delete pending share
            const { error: deleteError } = await supabase
              .from('pending_shares')
              .delete()
              .eq('id', pendingShare.id)

            if (deleteError) {
              console.error('Error deleting pending share:', deleteError)
            } else {
              console.log('Successfully deleted pending share:', pendingShare.id)
            }

            console.log('Successfully accepted pending share:', pendingShare.id)
            acceptedCount++
          } catch (error) {
            console.error('Error processing pending share:', error)
          }
        }

        // Set notification count
        if (acceptedCount > 0) {
          console.log('Setting pending shares accepted count to:', acceptedCount)
          setPendingSharesAccepted(acceptedCount)
        }
      } else {
        console.log('No pending shares found for user:', user.email)
      }
      
      console.log('=== END CHECKING PENDING SHARES ===')
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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setLoading(false)
      
      // Check for pending shares on initial load if user exists
      if (currentUser) {
        checkPendingShares(currentUser)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const newUser = session?.user ?? null
        setUser(newUser)
        setLoading(false)

        // Check for pending shares when user signs up or signs in
        if (event === 'SIGNED_IN' && newUser) {
          console.log('Auth event:', event, 'for user:', newUser.email)
          await checkPendingShares(newUser)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      console.log('AuthContext: Starting sign out process...')
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('AuthContext: Error during sign out:', error)
        throw error
      }
      console.log('AuthContext: Sign out successful')
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