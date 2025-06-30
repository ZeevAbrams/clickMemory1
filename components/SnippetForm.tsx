'use client'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSupabase } from '@/contexts/SupabaseContext'
import { Snippet } from '@/types/database'
import { trackEvent } from '@/lib/posthog'

interface SnippetFormProps {
  snippet?: Snippet
  onSave: (snippet: Snippet) => void
  onCancel: () => void
}

export default function SnippetForm({ snippet, onSave, onCancel }: SnippetFormProps) {
  const { supabase } = useSupabase()
  const { user } = useAuth()
  const [title, setTitle] = useState(snippet?.title || '')
  const [content, setContent] = useState(snippet?.content || '')
  const [isPublic, setIsPublic] = useState(snippet?.is_public || false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    if (!supabase) {
      alert('Service temporarily unavailable. Please try again later.')
      return
    }

    setLoading(true)
    try {
      if (snippet) {
        // Update existing snippet
        const { data, error } = await supabase
          .from('snippets')
          .update({
            title: title.trim(),
            content: content.trim(),
            is_public: isPublic,
            updated_at: new Date().toISOString()
          })
          .eq('id', snippet.id)
          .select()
          .single()

        if (error) throw error

        // Track snippet edit
        trackEvent('snippet_edited', {
          snippetId: snippet.id,
          snippetTitle: title.trim()
        })

        onSave(data)
      } else {
        // Create new snippet
        const { data, error } = await supabase
          .from('snippets')
          .insert([{
            title: title.trim(),
            content: content.trim(),
            is_public: isPublic,
            user_id: user?.id
          }])
          .select()
          .single()

        if (error) throw error

        // Track snippet creation
        trackEvent('snippet_created', {
          snippetId: data.id,
          snippetTitle: title.trim(),
          isPublic: isPublic
        })

        onSave(data)
      }
    } catch (error) {
      console.error('Error saving snippet:', error)
      alert('Failed to save snippet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-secondary mb-2">
          Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 border border-custom rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-text-primary placeholder-text-muted"
          placeholder="Enter snippet title"
          required
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-semibold text-secondary mb-2">
          Content
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          className="w-full px-4 py-3 border border-custom rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-text-primary placeholder-text-muted resize-vertical"
          placeholder="Enter your snippet content"
          required
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isPublic"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="w-4 h-4 text-primary bg-card border-custom rounded focus:ring-primary focus:ring-2"
        />
        <label htmlFor="isPublic" className="ml-2 text-sm text-secondary">
          Make this snippet public
        </label>
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 border border-custom rounded-2xl text-secondary hover:bg-secondary-light transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim() || !content.trim()}
          className="flex-1 px-4 py-3 bg-gradient-primary text-white rounded-2xl hover:bg-primary-hover disabled:opacity-50 transition-all font-semibold"
        >
          {loading ? 'Saving...' : (snippet ? 'Update Snippet' : 'Create Snippet')}
        </button>
      </div>
    </form>
  )
} 