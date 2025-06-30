'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Snippet } from '@/types/database'
import SnippetForm from '@/components/SnippetForm'

export default function EditSnippetPage() {
  const params = useParams()
  const [snippet, setSnippet] = useState<Snippet | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSnippet = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('snippets')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setSnippet(data)
    } catch (error) {
      console.error('Error fetching snippet:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchSnippet()
  }, [fetchSnippet])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent shadow-glow"></div>
      </div>
    )
  }

  if (!snippet) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary text-lg">Snippet not found</p>
      </div>
    )
  }

  return <SnippetForm snippet={snippet} isEdit={true} />
} 