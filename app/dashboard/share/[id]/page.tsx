'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Snippet, SharedSnippet, Profile } from '@/types/database'
import { Trash2, Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ShareSnippetPage() {
  const params = useParams()
  const [snippet, setSnippet] = useState<Snippet | null>(null)
  const [sharedWith, setSharedWith] = useState<(SharedSnippet & { profile: Profile })[]>([])
  const [loading, setLoading] = useState(true)
  const [shareEmail, setShareEmail] = useState('')
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view')
  const [sharing, setSharing] = useState(false)

  const fetchSnippetAndShares = useCallback(async () => {
    if (!supabase) return;

    try {
      // Fetch snippet
      const { data: snippetData, error: snippetError } = await supabase
        .from('snippets')
        .select('*')
        .eq('id', params.id)
        .single()

      if (snippetError) throw snippetError
      setSnippet(snippetData)

      // Fetch shared snippets
      const { data: sharesData, error: sharesError } = await supabase
        .from('shared_snippets')
        .select('*')
        .eq('snippet_id', params.id)

      if (sharesError) throw sharesError

      // Fetch profiles for all shared users
      if (sharesData && sharesData.length > 0) {
        const userIds = sharesData.map(share => share.shared_with_user_id)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)

        if (profilesError) throw profilesError

        // Combine shared snippets with profiles
        const combinedData = sharesData.map(share => {
          const profile = profilesData?.find(p => p.id === share.shared_with_user_id)
          return {
            ...share,
            profile: profile || { id: share.shared_with_user_id, email: 'Unknown User', created_at: '' }
          }
        })

        setSharedWith(combinedData)
      } else {
        setSharedWith([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchSnippetAndShares()
  }, [fetchSnippetAndShares])

  const shareSnippet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!snippet || !shareEmail.trim() || !supabase) return;

    setSharing(true)
    try {
      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', shareEmail.trim())
        .single()

      if (userError || !userData) {
        alert('User not found with that email address')
        setSharing(false)
        return
      }

      // Share the snippet
      const { error: shareError } = await supabase
        .from('shared_snippets')
        .insert([{
          snippet_id: snippet.id,
          shared_with_user_id: userData.id,
          permission: sharePermission
        }])

      if (shareError) {
        if (shareError.code === '23505') { // Unique constraint violation
          alert('Snippet is already shared with this user')
          setSharing(false)
          return
        } else {
          throw shareError
        }
      } else {
        setShareEmail('')
        fetchSnippetAndShares()
      }
    } catch (error) {
      console.error('Error sharing snippet:', error)
      alert('Failed to share snippet')
    } finally {
      setSharing(false)
    }
  }

  const removeShare = async (shareId: string) => {
    if (!confirm('Remove access for this user?') || !supabase) return;

    try {
      const { error } = await supabase
        .from('shared_snippets')
        .delete()
        .eq('id', shareId)

      if (error) throw error
      fetchSnippetAndShares()
    } catch (error) {
      console.error('Error removing share:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent shadow-glow"></div>
      </div>
    )
  }

  if (!snippet) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary text-lg">Snippet not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 text-secondary hover:text-primary hover:bg-primary-light rounded-xl transition-all"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-card rounded-3xl shadow-card border border-custom p-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Share Snippet</h1>
        <h2 className="text-lg text-secondary mb-8">{snippet.title}</h2>
        
        <form onSubmit={shareSnippet} className="space-y-6">
          <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex-1">
              <label htmlFor="email" className="block text-sm font-semibold text-secondary mb-3">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                required
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="w-full px-6 py-4 border border-custom rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-text-primary placeholder-text-muted shadow-card transition-all"
                placeholder="Enter user's email"
              />
            </div>
            
            <div className="lg:w-48">
              <label htmlFor="permission" className="block text-sm font-semibold text-secondary mb-3">
                Permission
              </label>
              <select
                id="permission"
                value={sharePermission}
                onChange={(e) => setSharePermission(e.target.value as 'view' | 'edit')}
                className="w-full px-6 py-4 border border-custom rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-text-primary shadow-card transition-all"
              >
                <option value="view">View Only</option>
                <option value="edit">Can Edit</option>
              </select>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={sharing}
            className="inline-flex items-center px-6 py-4 border border-transparent rounded-2xl shadow-glow text-sm font-semibold text-white bg-gradient-primary hover:bg-primary-hover disabled:opacity-50 transition-all"
          >
            <Mail className="h-4 w-4 mr-2" />
            {sharing ? 'Sharing...' : 'Share Snippet'}
          </button>
        </form>
      </div>

      <div className="bg-card rounded-3xl shadow-card border border-custom p-8">
        <h3 className="text-2xl font-bold text-text-primary mb-6">Shared With</h3>
        
        {sharedWith.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📤</div>
            <p className="text-secondary text-lg">This snippet hasn&apos;t been shared with anyone yet.</p>
            <p className="text-muted mt-2">Use the form above to share it with others</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sharedWith.map((share) => (
              <div key={share.id} className="flex items-center justify-between p-6 bg-gradient-card rounded-2xl border border-custom shadow-card">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {share.profile.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-text-primary">{share.profile.email}</p>
                    <p className="text-sm text-secondary">
                      {share.permission === 'edit' ? 'Can edit' : 'View only'}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => removeShare(share.id)}
                  className="text-danger hover:text-red-800 hover:bg-red-50 p-3 rounded-xl transition-all"
                  title="Remove access"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 