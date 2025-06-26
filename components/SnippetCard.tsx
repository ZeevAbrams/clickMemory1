'use client'
import { useState } from 'react'
import { Snippet } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { Copy, Edit, Trash2, Share, Globe, Lock, Users } from 'lucide-react'
import Link from 'next/link'
import SharePopup from './SharePopup'

interface SnippetCardProps {
  snippet: Snippet & { is_shared?: boolean; shared_permission?: string }
  onUpdate: () => void
}

export default function SnippetCard({ snippet, onUpdate }: SnippetCardProps) {
  const [copying, setCopying] = useState(false)
  const [showSharePopup, setShowSharePopup] = useState(false)

  const copyToClipboard = async () => {
    setCopying(true)
    try {
      await navigator.clipboard.writeText(snippet.content)
      setTimeout(() => setCopying(false), 1000)
    } catch (error) {
      console.error('Failed to copy:', error)
      setCopying(false)
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
      onUpdate()
    } catch (error) {
      console.error('Error deleting snippet:', error)
    }
  }

  const canEdit = !snippet.is_shared || snippet.shared_permission === 'edit'
  const canDelete = !snippet.is_shared

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