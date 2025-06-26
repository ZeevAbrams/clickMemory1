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
  titleCharLimit = 30,
  roleCharLimit = 80,
  contentCharLimit = 8000
}: SnippetFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      if (isEdit && snippet) {
        const { error } = await supabase
          .from('snippets')
          .update({
            title: formData.title,
            system_role: formData.system_role,
            content: formData.content,
            updated_at: new Date().toISOString()
          })
          .eq('id', snippet.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('snippets')
          .insert([{
            title: formData.title,
            system_role: formData.system_role,
            content: formData.content,
            user_id: user.id
          }])

        if (error) throw error
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Error saving snippet:', error)
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
              placeholder="Enter snippet title"
            />
            <div className="text-xs text-muted text-right mt-1">{formData.title.length}/{titleCharLimit}</div>
          </div>
          
          <div>
            <label htmlFor="system_role" className="block text-sm font-semibold text-secondary mb-3">
              System Role (Try to phrase this as "You are ...")
            </label>
            <input
              type="text"
              id="system_role"
              required
              maxLength={roleCharLimit}
              value={formData.system_role}
              onChange={(e) => setFormData({ ...formData, system_role: e.target.value.slice(0, roleCharLimit) })}
              className="w-full px-6 py-4 border border-custom rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-text-primary placeholder-text-muted shadow-card transition-all"
              placeholder="What is the Role of the AI assistant responding? e.g. 'You are the CEO' or 'You are my planning assistant'"
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
              placeholder="Enter your text snippet here"
            />
            <div className="text-xs text-muted text-right mt-1">{formData.content.length}/{contentCharLimit}</div>
          </div>
          
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-primary text-white py-4 px-6 rounded-2xl hover:bg-primary-hover hover-lift focus:ring-2 focus:ring-primary disabled:opacity-50 transition-all shadow-glow font-semibold"
            >
              {loading ? 'Saving...' : (isEdit ? 'Update Snippet' : 'Create Snippet')}
            </button>
            
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-card text-secondary py-4 px-6 rounded-2xl border border-custom hover:bg-secondary-light hover-lift transition-all shadow-card font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 