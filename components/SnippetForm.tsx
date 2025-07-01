'use client'
import { useState, forwardRef, useImperativeHandle } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSupabase } from '@/contexts/SupabaseContext'
import { Snippet } from '@/types/database'
import { trackEvent } from '@/lib/posthog'

interface SnippetFormProps {
  snippet?: Snippet
  onSave: (snippet: Snippet) => void
  onCancel: () => void
}

export interface SnippetFormRef {
  setFormData: (data: { title: string; system_role: string; content: string }) => void
}

const titleCharLimit = 100
const roleCharLimit = 200
const contentCharLimit = 2000

const SnippetForm = forwardRef<SnippetFormRef, SnippetFormProps>(({ snippet, onSave, onCancel }, ref) => {
  const { supabase } = useSupabase()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    title: snippet?.title || '',
    system_role: snippet?.system_role || '',
    content: snippet?.content || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!snippet

  // Expose setFormData method to parent component
  useImperativeHandle(ref, () => ({
    setFormData: (data: { title: string; system_role: string; content: string }) => {
      setFormData(data)
    }
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.content.trim()) return

    if (!supabase) {
      setError('Service temporarily unavailable. Please try again later.')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      if (snippet) {
        // Update existing snippet
        const { data, error } = await supabase
          .from('snippets')
          .update({
            title: formData.title.trim(),
            system_role: formData.system_role.trim() || 'user',
            content: formData.content.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', snippet.id)
          .select()
          .single()

        if (error) throw error

        // Track snippet edit
        trackEvent('snippet_edited', {
          snippetId: snippet.id,
          snippetTitle: formData.title.trim()
        })

        onSave(data)
      } else {
        // Create new snippet
        const { data, error } = await supabase
          .from('snippets')
          .insert([{
            title: formData.title.trim(),
            system_role: formData.system_role.trim() || 'user',
            content: formData.content.trim(),
            is_public: false,
            user_id: user?.id
          }])
          .select()
          .single()

        if (error) throw error

        // Track snippet creation
        trackEvent('snippet_created', {
          snippetId: data.id,
          snippetTitle: formData.title.trim(),
          isPublic: false
        })

        onSave(data)
      }
    } catch (error) {
      console.error('Error saving snippet:', error)
      setError('Failed to save snippet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-3xl shadow-card border border-custom p-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          {isEdit ? 'Edit Snippet' : 'Create New Snippet'}
        </h1>
        <p className="text-sm text-muted italic mb-8">
          Give the snippet a title, role and content. Use and edit ideas on the right or make up your own.
        </p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-secondary mb-3">
              Title (what you will see in the chrome extension)
            </label>
            <input
              type="text"
              id="title"
              required
              maxLength={titleCharLimit}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value.slice(0, titleCharLimit) })}
              className="w-full px-6 py-4 border border-custom rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-text-primary placeholder-text-muted shadow-card transition-all"
              placeholder="Enter snippet title (required)"
            />
            <div className="text-xs text-muted text-right mt-1">{formData.title.length}/{titleCharLimit}</div>
          </div>
          
          <div>
            <label htmlFor="system_role" className="block text-sm font-semibold text-secondary mb-3">
              System Role (Optional - Try to phrase this as &quot;You are ...&quot;)
            </label>
            <input
              type="text"
              id="system_role"
              maxLength={roleCharLimit}
              value={formData.system_role}
              onChange={(e) => setFormData({ ...formData, system_role: e.target.value.slice(0, roleCharLimit) })}
              className="w-full px-6 py-4 border border-custom rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-text-primary placeholder-text-muted shadow-card transition-all"
              placeholder="What is the Role of the AI assistant responding? e.g. &quot;You are the CEO&quot; or &quot;You are my planning assistant&quot;"
            />
            <div className="text-xs text-muted text-right mt-1">{formData.system_role.length}/{roleCharLimit}</div>
          </div>
          
          <div>
            <label htmlFor="content" className="block text-sm font-semibold text-secondary mb-3">
              Content (Get ideas on the right)
            </label>
            <textarea
              id="content"
              required
              rows={12}
              maxLength={contentCharLimit}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value.slice(0, contentCharLimit) })}
              className="w-full px-6 py-4 border border-custom rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-text-primary placeholder-text-muted shadow-card transition-all resize-none"
              placeholder="Enter your text snippet here (required)"
            />
            <div className="text-xs text-muted text-right mt-1">{formData.content.length}/{contentCharLimit}</div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-8 py-4 text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-primary text-white rounded-2xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                isEdit ? 'Update Snippet' : 'Create Snippet'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
})

SnippetForm.displayName = 'SnippetForm'

export default SnippetForm 