'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/contexts/SupabaseContext'
import { Snippet } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'
import SnippetCard from '@/components/SnippetCard'


export default function DashboardPage() {
  const { supabase } = useSupabase()
  const { user, checkPendingShares } = useAuth()
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const loadSnippets = useCallback(async () => {
    if (!supabase || !user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('snippets')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error

      setSnippets(data || [])
    } catch (error) {
      console.error('Error loading snippets:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, user])

  useEffect(() => {
    if (user) {
      loadSnippets()
      checkPendingShares()
    }
  }, [user, supabase, loadSnippets, checkPendingShares])

  const filteredSnippets = snippets.filter(snippet => {
    return snippet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           snippet.content.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-text-primary">Loading snippets...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-text-primary">My Snippets</h1>
        <Link
          href="/dashboard/new"
          className="flex items-center px-6 py-3 bg-gradient-primary text-white rounded-2xl hover:bg-primary-hover transition-all font-semibold"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Snippet
        </Link>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary h-4 w-4" />
          <input
            type="text"
            placeholder="Search snippets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-custom rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-text-primary placeholder-text-muted"
          />
        </div>
      </div>

      {/* Snippets Grid */}
      {filteredSnippets.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            {searchTerm ? 'No snippets found' : 'No snippets yet'}
          </h3>
          <p className="text-secondary mb-6">
            {searchTerm 
              ? 'Try adjusting your search criteria'
              : 'Create your first snippet to get started'
            }
          </p>
          {!searchTerm && (
            <Link
              href="/dashboard/new"
              className="inline-flex items-center px-6 py-3 bg-gradient-primary text-white rounded-2xl hover:bg-primary-hover transition-all font-semibold"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Snippet
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSnippets.map((snippet) => (
            <SnippetCard
              key={snippet.id}
              snippet={snippet}
              onUpdate={loadSnippets}
            />
          ))}
        </div>
      )}
    </div>
  )
} 