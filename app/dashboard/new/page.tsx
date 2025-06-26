'use client'
import SnippetForm from '@/components/SnippetForm'
import { useState } from 'react'
import { SNIPPET_IDEAS, SNIPPET_TITLE_CHAR_LIMIT, SNIPPET_ROLE_CHAR_LIMIT, SNIPPET_CONTENT_CHAR_LIMIT, SnippetIdea } from '@/lib/snippetIdeas'

export default function NewSnippetPage() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [pendingContent, setPendingContent] = useState<string>('')

  // This will be called by the sidebar button to add content to the form
  const handleUseTemplate = (content: string) => {
    setPendingContent(content)
  }

  // This will be called by the form after it consumes the pending content
  const clearPendingContent = () => setPendingContent('')

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Main Form */}
      <div className="flex-1">
        <SnippetForm
          pendingContent={pendingContent}
          clearPendingContent={clearPendingContent}
          titleCharLimit={SNIPPET_TITLE_CHAR_LIMIT}
          roleCharLimit={SNIPPET_ROLE_CHAR_LIMIT}
          contentCharLimit={SNIPPET_CONTENT_CHAR_LIMIT}
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
              onClick={() => {
                if (expandedIndex !== null) {
                  handleUseTemplate(SNIPPET_IDEAS[expandedIndex].content)
                }
              }}
            >
              Add This Template
            </button>
          </div>
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