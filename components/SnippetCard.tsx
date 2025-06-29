'use client'
import { useState } from 'react'
import { Snippet } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { Copy, Edit, Trash2, Share, Lock, Users, MousePointer, Plus } from 'lucide-react'
import Link from 'next/link'
import SharePopup from './SharePopup'
import { CONTEXT_MENU_SNIPPET_LIMIT } from '@/lib/snippetIdeas'
import { trackEvent } from '@/lib/posthog'

interface SnippetCardProps {
  snippet: Snippet & { is_shared?: boolean; shared_permission?: string }
  onUpdate: () => void
}

export default function SnippetCard({ snippet, onUpdate }: SnippetCardProps) {
  const [copying, setCopying] = useState(false)
  const [showSharePopup, setShowSharePopup] = useState(false)
  const [updatingContextMenu, setUpdatingContextMenu] = useState(false)
  const [copyingToMySnippets, setCopyingToMySnippets] = useState(false)

  const copyToClipboard = async () => {
    setCopying(true)
    try {
      await navigator.clipboard.writeText(snippet.content)
      setTimeout(() => setCopying(false), 1000)
      
      // Track copy action
      trackEvent('snippet_copied', {
        snippetId: snippet.id,
        title: snippet.title,
        isShared: snippet.is_shared,
        source: 'web_app'
      })
    } catch (error) {
      console.error('Failed to copy:', error)
      setCopying(false)
      
      // Track copy error
      trackEvent('snippet_copy_error', {
        snippetId: snippet.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const copyToMySnippets = async () => {
    setCopyingToMySnippets(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Create a copy of the shared snippet as your own
      const { error } = await supabase
        .from('snippets')
        .insert([{
          title: `${snippet.title} (Shared)`,
          system_role: snippet.system_role || 'user', // Include the required system_role field
          content: snippet.content,
          is_public: false, // Start as private, user can make public if they want
          user_id: user.id
        }])

      if (error) throw error
      
      // Track copy to my snippets
      trackEvent('shared_snippet_copied', {
        originalSnippetId: snippet.id,
        originalTitle: snippet.title,
        sharedPermission: snippet.shared_permission
      })
      
      alert('Snippet copied to your snippets! You can now edit it and add it to your context menu.')
      onUpdate()
    } catch (error) {
      console.error('Error copying snippet:', error)
      alert('Failed to copy snippet to your snippets')
      
      // Track error
      trackEvent('shared_snippet_copy_error', {
        originalSnippetId: snippet.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setCopyingToMySnippets(false)
    }
  }

  const deleteSnippet = async () => {
    if (!confirm('Are you sure you want to delete this snippet?')) return

    try {
      const { error } = await supabase
        .from('snippets')
        .delete()
        .eq('id', snippet.id)

      if (error) throw error
      
      // Track deletion
      trackEvent('snippet_deleted', {
        snippetId: snippet.id,
        title: snippet.title,
        isShared: snippet.is_shared
      })
      
      onUpdate()
    } catch (error) {
      console.error('Error deleting snippet:', error)
      
      // Track error
      trackEvent('snippet_delete_error', {
        snippetId: snippet.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const toggleContextMenu = async () => {
    // If we're trying to make it public, check the limit first
    if (!snippet.is_public) {
      // Count current public snippets
      const { data: publicSnippets, error: countError } = await supabase
        .from('snippets')
        .select('id')
        .eq('user_id', snippet.user_id)
        .eq('is_public', true)

      if (countError) {
        console.error('Error counting public snippets:', countError)
        return
      }

      const currentPublicCount = publicSnippets?.length || 0
      
      if (currentPublicCount >= CONTEXT_MENU_SNIPPET_LIMIT) {
        alert(`Maximum ${CONTEXT_MENU_SNIPPET_LIMIT} snippets allowed in context menu. Please uncheck another snippet first.`)
        return
      }
    }

    setUpdatingContextMenu(true)
    try {
      const { error } = await supabase
        .from('snippets')
        .update({ is_public: !snippet.is_public })
        .eq('id', snippet.id)

      if (error) {
        if (error.message.includes('Maximum 5 snippets allowed')) {
          alert(`Maximum ${CONTEXT_MENU_SNIPPET_LIMIT} snippets allowed in context menu. Please uncheck another snippet first.`)
        } else {
          throw error
        }
      } else {
        // Track context menu toggle
        trackEvent('context_menu_toggled', {
          snippetId: snippet.id,
          title: snippet.title,
          enabled: !snippet.is_public
        })
        
        onUpdate()
      }
    } catch (error) {
      console.error('Error updating context menu status:', error)
      
      // Track error
      trackEvent('context_menu_toggle_error', {
        snippetId: snippet.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setUpdatingContextMenu(false)
    }
  }

  const canEdit = !snippet.is_shared || snippet.shared_permission === 'edit'
  const canDelete = !snippet.is_shared
  const canContextMenu = !snippet.is_shared // Only own snippets can be in context menu

  return (
    <>
      <div className="bg-gradient-card rounded-2xl shadow-card border border-custom p-8 hover:shadow-card-hover hover-lift transition-all group">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-text-primary truncate group-hover:text-primary transition-colors">
            {snippet.title}
          </h3>
          <div className="flex items-center space-x-2 ml-3">
            {snippet.is_shared ? (
              <div title={`Shared (${snippet.shared_permission})`} className="p-2 bg-primary/10 rounded-xl">
                <Users className="h-5 w-5 text-primary" />
              </div>
            ) : (
              <div title="Private" className="p-2 bg-secondary/10 rounded-xl">
                <Lock className="h-5 w-5 text-secondary" />
              </div>
            )}
          </div>
        </div>
        
        <p className="text-secondary text-sm mb-6 line-clamp-3 leading-relaxed">
          {snippet.content}
        </p>
        
        {/* Context Menu Toggle - Only for own snippets */}
        {canContextMenu && (
          <div className="mb-4 p-3 bg-primary/5 rounded-xl border border-primary/20">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={snippet.is_public}
                onChange={toggleContextMenu}
                disabled={updatingContextMenu}
                className="w-4 h-4 text-primary bg-card border-custom rounded focus:ring-primary focus:ring-2"
              />
              <div className="flex items-center space-x-2">
                <MousePointer className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-text-primary">
                  Available in right-click context menu
                </span>
                {updatingContextMenu && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                )}
              </div>
            </label>
            <p className="text-xs text-muted mt-1 ml-7">
              {snippet.is_public 
                ? 'This snippet will appear in the right-click menu on webpages' 
                : `Check to make this snippet available in the right-click menu (max ${CONTEXT_MENU_SNIPPET_LIMIT})`
              }
            </p>
          </div>
        )}

        {/* Copy to My Snippets - Only for shared snippets */}
        {snippet.is_shared && (
          <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <button
              onClick={copyToMySnippets}
              disabled={copyingToMySnippets}
              className="flex items-center space-x-2 text-blue-700 hover:text-blue-800 hover:bg-blue-100 px-3 py-2 rounded-lg transition-all"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">
                {copyingToMySnippets ? 'Copying...' : 'Copy to My Snippets'}
              </span>
              {copyingToMySnippets && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-700 border-t-transparent"></div>
              )}
            </button>
            <p className="text-xs text-blue-600 mt-1 ml-7">
              Copy this shared snippet to your own snippets so you can edit it and add it to your context menu
            </p>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <div className="flex space-x-3">
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-primary-light rounded-xl transition-all"
              title="Copy to clipboard"
            >
              <Copy className="h-4 w-4 mr-1" />
              {copying ? 'Copied!' : ''}
            </button>
            
            {canEdit && (
              <Link
                href={`/dashboard/edit/${snippet.id}`}
                className="inline-flex items-center px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-primary-light rounded-xl transition-all"
                title="Edit"
              >
                <Edit className="h-4 w-4 mr-1" />
              </Link>
            )}
            
            {!snippet.is_shared && (
              <button
                onClick={() => setShowSharePopup(true)}
                className="inline-flex items-center px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-primary-light rounded-xl transition-all"
                title="Share"
              >
                <Share className="h-4 w-4 mr-1" />
              </button>
            )}
            
            {canDelete && (
              <button
                onClick={deleteSnippet}
                className="inline-flex items-center px-3 py-2 text-sm text-danger hover:text-red-800 hover:bg-red-50 rounded-xl transition-all"
                title="Delete"
              >
                <Trash2 className="h-4 w-4 mr-1" />
              </button>
            )}
          </div>
          
          <span className="text-xs text-muted font-medium bg-secondary-light px-3 py-1 rounded-full">
            {new Date(snippet.updated_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <SharePopup
        snippet={snippet}
        isOpen={showSharePopup}
        onClose={() => setShowSharePopup(false)}
        onShareSuccess={onUpdate}
      />
    </>
  )
} 