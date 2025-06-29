'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Snippet } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import SnippetCard from '@/components/SnippetCard'
import { Search, RefreshCw, MousePointer } from 'lucide-react'
import { CONTEXT_MENU_SNIPPET_LIMIT, TOTAL_SNIPPET_LIMIT } from '@/lib/snippetIdeas'

export default function Dashboard() {
  const { user, checkPendingShares } = useAuth()
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [checkingPending, setCheckingPending] = useState(false)
  const [contextMenuCount, setContextMenuCount] = useState(0)
  const [totalSnippetCount, setTotalSnippetCount] = useState(0)

  useEffect(() => {
    if (user) {
      fetchSnippets()
    }
  }, [user])

  const fetchSnippets = async () => {
    try {
      // Fetch own snippets
      const { data: ownSnippets, error: ownError } = await supabase
        .from('snippets')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })

      if (ownError) throw ownError

      // Fetch shared snippets
      const { data: sharedSnippets, error: sharedError } = await supabase
        .from('shared_snippets')
        .select(`
          snippet_id,
          permission,
          snippets (*)
        `)
        .eq('shared_with_user_id', user?.id)

      if (sharedError) throw sharedError

      // Combine own snippets with shared snippets
      const ownSnippetsList = ownSnippets || []
      const sharedSnippetsList = (sharedSnippets || []).map(share => ({
        ...share.snippets,
        is_shared: true,
        shared_permission: share.permission
      }))

      const allSnippets = [...ownSnippetsList, ...sharedSnippetsList]
      
      // Sort by updated_at
      allSnippets.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )

      setSnippets(allSnippets)
      
      // Calculate context menu count (only own snippets can be in context menu)
      const ownContextMenuCount = ownSnippetsList.filter(snippet => snippet.is_public).length
      setContextMenuCount(ownContextMenuCount)

      // Set total snippet count
      setTotalSnippetCount(allSnippets.length)
    } catch (error) {
      console.error('Error fetching snippets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckPendingShares = async () => {
    setCheckingPending(true)
    try {
      await checkPendingShares()
      // Refresh snippets after checking pending shares
      await fetchSnippets()
    } catch (error) {
      console.error('Error checking pending shares:', error)
    } finally {
      setCheckingPending(false)
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
          <div className="flex items-center space-x-6 mt-2">
            <div className="flex items-center space-x-2">
              <MousePointer className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted">
                Context Menu: {contextMenuCount}/{CONTEXT_MENU_SNIPPET_LIMIT} snippets
              </span>
              {contextMenuCount >= CONTEXT_MENU_SNIPPET_LIMIT && (
                <span className="text-xs text-red-500 font-medium">(Limit reached)</span>
              )}
            </div>
            <div className="flex items-center space-x-2 group relative">
              <div className="h-4 w-4 text-secondary">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <span className="text-sm text-muted">
                Total: {totalSnippetCount}/{TOTAL_SNIPPET_LIMIT} snippets
              </span>
              {totalSnippetCount >= TOTAL_SNIPPET_LIMIT && (
                <span className="text-xs text-red-500 font-medium">(Limit reached)</span>
              )}
              {totalSnippetCount >= TOTAL_SNIPPET_LIMIT * 0.8 && totalSnippetCount < TOTAL_SNIPPET_LIMIT && (
                <span className="text-xs text-yellow-500 font-medium">(Approaching limit)</span>
              )}
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                Limited to {TOTAL_SNIPPET_LIMIT} snippets in the free version
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleCheckPendingShares}
            disabled={checkingPending}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-secondary hover:text-primary hover:bg-primary-light rounded-xl transition-all disabled:opacity-50"
            title="Check for pending shared snippets"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${checkingPending ? 'animate-spin' : ''}`} />
            {checkingPending ? 'Checking...' : 'Check Pending'}
          </button>
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