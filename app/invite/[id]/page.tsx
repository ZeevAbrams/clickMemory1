'use client'
import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Snippet } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react'
import Link from 'next/link'

// Create a regular client for user operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface PendingShare {
  id: string
  snippet_id: string
  email: string
  created_at: string
  expires_at: string
}

export default function InvitePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user: authUser, loading: authLoading } = useAuth()
  
  const [snippet, setSnippet] = useState<Snippet | null>(null)
  const [pendingShare, setPendingShare] = useState<PendingShare | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [accepting, setAccepting] = useState(false)

  const snippetId = params.id as string
  const email = searchParams.get('email')

  useEffect(() => {
    if (!snippetId || !email) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }

    fetchInvitationData()
  }, [snippetId, email])

  // Check for user changes (e.g., after signup)
  useEffect(() => {
    if (authUser && !user) {
      setUser(authUser)
      // If we have snippet data but user just signed up, try to accept invitation
      if (snippet && pendingShare && !accepting) {
        handleAcceptInvitation()
      }
    }
  }, [authUser, user, snippet, pendingShare, accepting])

  const fetchInvitationData = async () => {
    try {
      console.log('Fetching invitation data for snippet:', snippetId, 'email:', email)
      
      // Use API route to fetch invitation data
      const response = await fetch(`/api/invitation/${snippetId}?email=${encodeURIComponent(email!)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
        setError(errorData.error || 'Failed to load invitation')
        return
      }

      const data = await response.json()
      console.log('Invitation data received:', data)
      
      setSnippet(data.snippet)
      setPendingShare(data.pendingShare)

      // Check if user is already logged in
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

    } catch (error) {
      console.error('Error fetching invitation data:', error)
      setError('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    if (!user || !pendingShare) return

    setAccepting(true)
    try {
      // Create actual share
      const { error: shareError } = await supabase
        .from('shared_snippets')
        .insert([{
          snippet_id: snippetId,
          shared_with_user_id: user.id,
          permission: 'view' // Default to view permission for invitations
        }])

      if (shareError) {
        console.error('Error creating share:', shareError)
        setError('Failed to accept invitation')
        return
      }

      // Delete pending share
      await supabase
        .from('pending_shares')
        .delete()
        .eq('id', pendingShare.id)

      // Redirect to shared snippets
      router.push('/dashboard/shared')
    } catch (error) {
      console.error('Error accepting invitation:', error)
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  const copyToClipboard = async () => {
    if (!snippet) return
    
    try {
      await navigator.clipboard.writeText(snippet.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent shadow-glow"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-3xl shadow-card border border-custom p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-4">Invitation Error</h1>
          <p className="text-secondary mb-6">{error}</p>
          <button
            onClick={() => router.push(`/auth?returnTo=${encodeURIComponent(window.location.href)}`)}
            className="bg-gradient-primary text-white px-6 py-3 rounded-2xl hover:bg-primary-hover transition-all font-semibold shadow-glow"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (!snippet || !pendingShare) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-3xl shadow-card border border-custom p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-4">Invitation Not Found</h1>
          <p className="text-secondary mb-6">This invitation may have expired or been revoked.</p>
          <button
            onClick={() => router.push(`/auth?returnTo=${encodeURIComponent(window.location.href)}`)}
            className="bg-gradient-primary text-white px-6 py-3 rounded-2xl hover:bg-primary-hover transition-all font-semibold shadow-glow"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-3xl shadow-card border border-custom p-8 mb-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Snippet Invitation</h1>
            <p className="text-secondary">You've been invited to view a snippet</p>
          </div>

          <div className="bg-gradient-card rounded-2xl border border-custom p-6 mb-6">
            <h2 className="text-xl font-bold text-text-primary mb-2">{snippet.title}</h2>
            <p className="text-secondary mb-4">System Role: {snippet.system_role}</p>
            <div className="bg-secondary-light rounded-xl p-4 mb-4">
              <p className="text-sm text-text-primary whitespace-pre-wrap">{snippet.content}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">
                Permission: <span className="font-semibold capitalize">view</span>
              </span>
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-primary-light rounded-xl transition-all"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? 'Copied!' : 'Copy Content'}
              </button>
            </div>
          </div>

          {!user ? (
            <div className="text-center space-y-4">
              <p className="text-secondary">To accept this invitation and save this snippet to your account:</p>
              <button
                onClick={() => router.push(`/auth?returnTo=${encodeURIComponent(window.location.href)}`)}
                className="bg-gradient-primary text-white px-6 py-3 rounded-2xl hover:bg-primary-hover transition-all font-semibold shadow-glow"
              >
                Sign Up / Login
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-secondary">You're logged in as <strong>{user.email}</strong></p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleAcceptInvitation}
                  disabled={accepting}
                  className="bg-gradient-primary text-white px-6 py-3 rounded-2xl hover:bg-primary-hover transition-all font-semibold shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {accepting ? 'Accepting...' : 'Accept Invitation'}
                </button>
                <button
                  onClick={() => router.push('/dashboard/shared')}
                  className="bg-card text-secondary px-6 py-3 rounded-2xl border border-custom hover:bg-secondary-light transition-all font-semibold shadow-card"
                >
                  View All Shared Snippets
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-card rounded-3xl shadow-card border border-custom p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">What happens when you accept?</h3>
          <ul className="space-y-2 text-secondary">
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
              <span>This snippet will be added to your "Shared With Me" section</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
              <span>You'll be able to view and edit the snippet</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
              <span>The invitation will be removed from pending shares</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
} 