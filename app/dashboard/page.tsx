'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Snippet } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import SnippetCard from '@/components/SnippetCard'
import { Search } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (user) {
      fetchSnippets()
    }
  }, [user])

  const fetchSnippets = async () => {
    try {
      const { data, error } = await supabase
        .from('snippets')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setSnippets(data || [])
    } catch (error) {
      console.error('Error fetching snippets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSnippets = snippets.filter(snippet =>
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
          <h1 className="text-4xl font-bold text-text-primary mb-2">My Snippets</h1>
          <p className="text-secondary text-lg">Store and organize your thoughts</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted h-5 w-5" />
          <input
            type="text"
            placeholder="Search snippets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-6 py-4 border border-custom rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-text-primary placeholder-text-muted shadow-card w-full lg:w-80 transition-all"
          />
        </div>
      </div>

      {filteredSnippets.length === 0 ? (
        <div className="text-center py-16 bg-gradient-card rounded-3xl border border-custom shadow-card">
          <div className="text-6xl mb-4">🧠</div>
          <p className="text-secondary text-xl font-medium mb-2">No snippets found</p>
          <p className="text-muted">Create your first snippet to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredSnippets.map((snippet) => (
            <SnippetCard 
              key={snippet.id} 
              snippet={snippet} 
              onUpdate={fetchSnippets}
            />
          ))}
        </div>
      )}
    </div>
  )
} 