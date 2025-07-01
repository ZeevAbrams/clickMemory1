'use client'
import SnippetForm, { SnippetFormRef } from '@/components/SnippetForm'
import { useState, useEffect, useRef } from 'react'
import { SNIPPET_IDEAS, SNIPPET_CONTENT_CHAR_LIMIT } from '@/lib/snippetIdeas'
import { useSupabase } from '@/contexts/SupabaseContext'
import { useAuth } from '@/contexts/AuthContext'

import { useRouter } from 'next/navigation'

export default function NewSnippetPage() {
  const { supabase } = useSupabase()
  const { user } = useAuth()
  const router = useRouter()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const formRef = useRef<SnippetFormRef | null>(null)

  // Fetch current snippet count
  useEffect(() => {
    const fetchSnippetCount = async () => {
      if (!user || !supabase) return;
      
      try {
        // Fetch own snippets (just for loading state)
        const { error: ownError } = await supabase
          .from('snippets')
          .select('id')
          .eq('user_id', user.id)

        if (ownError) throw ownError

        // Fetch shared snippets (just for loading state)
        const { error: sharedError } = await supabase
          .from('shared_snippets')
          .select('snippet_id')
          .eq('shared_with_user_id', user.id)

        if (sharedError) throw sharedError

        // Fetch completed, just for loading state
      } catch (error) {
        console.error('Error fetching snippet count:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSnippetCount()
  }, [user, supabase])

  // This will be called by the sidebar button to add content to the form
  const handleUseTemplate = () => {
    if (expandedIndex !== null && formRef.current) {
      const selectedIdea = SNIPPET_IDEAS[expandedIndex]
      
      // Set the form data with the selected template
      formRef.current.setFormData({
        title: selectedIdea.title,
        system_role: '',
        content: selectedIdea.content
      })
      
      // Close the expanded template
      setExpandedIndex(null)
    }
  }

  // Handle form save
  const handleSave = () => {
    router.push('/dashboard')
  }

  // Handle form cancel
  const handleCancel = () => {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent shadow-glow"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Main Form */}
      <div className="flex-1">
        <SnippetForm
          ref={formRef}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
      {/* Sidebar (or below on mobile) */}
      <aside className="w-full lg:w-96 max-w-full lg:max-w-xs order-last lg:order-none">
        <div className="bg-card border border-custom rounded-2xl shadow-card p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-primary">Prompt Ideas</h2>
            <button
              className="bg-gradient-primary text-white px-4 py-2 rounded-lg font-semibold shadow-glow hover:bg-primary-hover transition-all disabled:opacity-50"
              disabled={expandedIndex === null}
              onClick={handleUseTemplate}
            >
              Add This Template
            </button>
          </div>
          <p className="text-sm text-muted italic mb-4">These can be chained together (check out iteraite.com for help)</p>
          <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
            {SNIPPET_IDEAS.map((idea, idx) => (
              <div key={idea.title} className="mb-2 border-b border-custom pb-2">
                <button
                  className="w-full text-left font-semibold text-secondary hover:text-primary transition-colors truncate"
                  style={{ maxWidth: '100%' }}
                  onClick={() => setExpandedIndex(idx === expandedIndex ? null : idx)}
                  title={idea.title}
                >
                  {idea.title}
                </button>
                {expandedIndex === idx && (
                  <div className="mt-2 text-sm text-muted">
                    <div className="mb-1">
                      <span className="font-bold">Content:</span> {idea.content} <span className="text-xs">({idea.content.length}/{SNIPPET_CONTENT_CHAR_LIMIT})</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
} 