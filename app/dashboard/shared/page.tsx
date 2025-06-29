'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Snippet } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import SnippetCard from '@/components/SnippetCard'
import { Search } from 'lucide-react'

export default function SharedSnippetsPage() {
  const { user } = useAuth()
  const [sharedSnippets, setSharedSnippets] = useState<Snippet[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (user) {
      fetchSharedSnippets()
    }
  }, [user])

  const fetchSharedSnippets = async () => {
    try {
      // First, get all shared snippet IDs for the current user
      const { data: sharedData, error: sharedError } = await supabase
        .from('shared_snippets')
        .select('snippet_id, permission')
        .eq('shared_with_user_id', user?.id)

      if (sharedError) throw sharedError

      if (sharedData && sharedData.length > 0) {
        // Get the actual snippets
        const snippetIds = sharedData.map(share => share.snippet_id)
        const { data: snippetsData, error: snippetsError } = await supabase
          .from('snippets')
          .select('*')
          .in('id', snippetIds)
          .order('updated_at', { ascending: false })

        if (snippetsError) throw snippetsError

        // Combine snippets with their sharing info
        const transformedSnippets = (snippetsData || []).map(snippet => {
          const shareInfo = sharedData.find(share => share.snippet_id === snippet.id)
          return {
            ...snippet,
            is_shared: true,
            shared_permission: shareInfo?.permission || 'view'
          }
        })

        setSharedSnippets(transformedSnippets)
      } else {
        setSharedSnippets([])
      }
    } catch (error) {
      console.error('Error fetching shared snippets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSnippets = sharedSnippets.filter(snippet =>
    snippet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    snippet.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent shadow-glow"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold text-text-primary mb-2">Shared With Me</h1>
          <p className="text-secondary text-lg">Snippets shared by other users</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted h-5 w-5" />
          <input
            type="text"
            placeholder="Search shared snippets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-6 py-4 border border-custom rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-text-primary placeholder-text-muted shadow-card w-full lg:w-80 transition-all"
          />
        </div>
      </div>

      {filteredSnippets.length === 0 ? (
        <div className="text-center py-16 bg-gradient-card rounded-3xl border border-custom shadow-card">
          <div className="text-6xl mb-4">📤</div>
          <p className="text-secondary text-xl font-medium mb-2">No snippets shared with you yet</p>
          <p className="text-muted">When other users share snippets with you, they'll appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredSnippets.map((snippet) => (
            <SnippetCard 
              key={snippet.id} 
              snippet={snippet} 
              onUpdate={fetchSharedSnippets}
            />
          ))}
        </div>
      )}
    </div>
  )
} 