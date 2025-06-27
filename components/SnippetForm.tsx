'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Snippet } from '@/types/database'

interface SnippetFormProps {
  snippet?: Snippet
  isEdit?: boolean
  pendingContent?: string
  clearPendingContent?: () => void
  titleCharLimit?: number
  roleCharLimit?: number
  contentCharLimit?: number
}

export default function SnippetForm({
  snippet,
  isEdit = false,
  pendingContent = '',
  clearPendingContent,
  titleCharLimit = 100,
  roleCharLimit = 80,
  contentCharLimit = 8000
}: SnippetFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: snippet?.title || '',
    system_role: snippet?.system_role || '',
    content: snippet?.content || ''
  })

  // Append pendingContent to content when it changes
  useEffect(() => {
    if (pendingContent) {
      setFormData((prev) => ({
        ...prev,
        content: prev.content
          ? (prev.content + '\n' + pendingContent).slice(0, contentCharLimit)
          : pendingContent.slice(0, contentCharLimit)
      }))
      if (clearPendingContent) clearPendingContent()
    }
  }, [pendingContent, clearPendingContent, contentCharLimit])

  const validateForm = (): boolean => {
    setError(null)
    
    if (!formData.title.trim()) {
      setError('Title is required')
      return false
    }
    
    if (!formData.content.trim()) {
      setError('Content is required')
      return false
    }
    
    if (formData.title.length > titleCharLimit) {
      setError(`Title must be ${titleCharLimit} characters or less`)
      return false
    }
    
    if (formData.content.length > contentCharLimit) {
      setError(`Content must be ${contentCharLimit} characters or less`)
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      if (isEdit && snippet) {
        const { error } = await supabase
          .from('snippets')
          .update({
            title: formData.title.trim(),
            system_role: formData.system_role.trim(),
            content: formData.content.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', snippet.id)

        if (error) {
          if (error.message.includes('Maximum 15 snippets')) {
            setError('You have reached the maximum limit of 15 snippets. Please delete some snippets first.')
          } else {
            setError('Failed to update snippet: ' + error.message)
          }
          return
        }
      } else {
        const { error } = await supabase
          .from('snippets')
          .insert([{
            title: formData.title.trim(),
            system_role: formData.system_role.trim(),
            content: formData.content.trim(),
            user_id: user.id
          }])

        if (error) {
          if (error.message.includes('Maximum 15 snippets')) {
            setError('You have reached the maximum limit of 15 snippets. Please delete some snippets first.')
          } else {
            setError('Failed to create snippet: ' + error.message)
          }
          return
        }
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Error saving snippet:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-3xl shadow-card border border-custom p-8">
        <h1 className="text-3xl font-bold text-text-primary mb-8">
          {isEdit ? 'Edit Snippet' : 'Create New Snippet'}
        </h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-secondary mb-3">
              Title * (what you will see in the chrome extension)
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
              System Role (Optional - Try to phrase this as "You are ...")
            </label>
            <input
              type="text"
              id="system_role"
              maxLength={roleCharLimit}
              value={formData.system_role}
              onChange={(e) => setFormData({ ...formData, system_role: e.target.value.slice(0, roleCharLimit) })}
              className="w-full px-6 py-4 border border-custom rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-text-primary placeholder-text-muted shadow-card transition-all"
              placeholder="What is the Role of the AI assistant responding? e.g. 'You are the CEO' or 'You are my planning assistant' (optional)"
            />
            <div className="text-xs text-muted text-right mt-1">{formData.system_role.length}/{roleCharLimit}</div>
          </div>
          
          <div>
            <label htmlFor="content" className="block text-sm font-semibold text-secondary mb-3">
              Content * (Get ideas on the right)
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
              onClick={() => router.push('/dashboard')}
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
} 