import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { TOTAL_SNIPPET_LIMIT } from '@/lib/snippetIdeas'

// Type for Supabase API key response
interface ApiKeyData {
  user_id: string
  is_active: boolean
  expires_at: string | null
}

// Type for snippet data
interface SnippetData {
  id: string
  title: string
  content: string
  system_role?: string
  is_public?: boolean
  updated_at: string
  [key: string]: unknown
}

// Type for shared snippet data
interface SharedSnippetData {
  snippet_id: string
  permission: string
  snippets: SnippetData
}

// Helper type for Supabase response
interface SupabaseResponse<T> {
  data: T | null;
  error: unknown;
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database service not available' }, { status: 503 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const apiKey = authHeader.substring(7)
    const contextMenu = request.nextUrl.searchParams.get('context_menu') === 'true'

    // Validate API key with timeout
    const keyPromise = supabaseAdmin
      .from('user_api_keys')
      .select('user_id, is_active, expires_at')
      .eq('api_key', apiKey)
      .single()

    const { data: apiKeyData, error: keyError } = await Promise.race([
      keyPromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
    ]) as SupabaseResponse<ApiKeyData>

    if (keyError || !apiKeyData) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    if (!apiKeyData.is_active) {
      return NextResponse.json({ error: 'API key is inactive' }, { status: 401 })
    }

    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'API key has expired' }, { status: 401 })
    }

    // Update last used timestamp with timeout
    const updatePromise = supabaseAdmin
      .from('user_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('api_key', apiKey)

    await Promise.race([
      updatePromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
    ])

    // Fetch snippets based on context menu parameter
    if (contextMenu) {
      // Only fetch public snippets for context menu
      const contextPromise = supabaseAdmin
        .from('snippets')
        .select('id, title, content, system_role, is_public')
        .eq('user_id', apiKeyData.user_id)
        .eq('is_public', true)
        .order('updated_at', { ascending: false })

      const { data: contextSnippets, error: contextError } = await Promise.race([
        contextPromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
      ]) as SupabaseResponse<SnippetData[]>

      if (contextError) {
        console.error('Error fetching context menu snippets:', contextError)
        return NextResponse.json({ error: 'Failed to fetch snippets' }, { status: 500 })
      }

      return NextResponse.json({ 
        snippets: contextSnippets || [],
        contextMenu: true 
      })
    } else {
      // Fetch all snippets (own + shared)
      const ownPromise = supabaseAdmin
        .from('snippets')
        .select('*')
        .eq('user_id', apiKeyData.user_id)
        .order('updated_at', { ascending: false })

      const { data: ownSnippets, error: ownError } = await Promise.race([
        ownPromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
      ]) as SupabaseResponse<SnippetData[]>

      if (ownError) {
        console.error('Error fetching own snippets:', ownError)
        return NextResponse.json({ error: 'Failed to fetch snippets' }, { status: 500 })
      }

      // Fetch shared snippets with timeout
      const sharedPromise = supabaseAdmin
        .from('shared_snippets')
        .select(`
          snippet_id,
          permission,
          snippets (*)
        `)
        .eq('shared_with_user_id', apiKeyData.user_id)

      const { data: sharedSnippets, error: sharedError } = await Promise.race([
        sharedPromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
      ]) as SupabaseResponse<SharedSnippetData[]>

      if (sharedError) {
        console.error('Error fetching shared snippets:', sharedError)
        return NextResponse.json({ error: 'Failed to fetch snippets' }, { status: 500 })
      }

      // Combine own snippets with shared snippets
      const ownSnippetsList = ownSnippets || []
      const sharedSnippetsList = (sharedSnippets || []).map((share: SharedSnippetData) => ({
        ...share.snippets,
        is_shared: true,
        shared_permission: share.permission
      }))

      const allSnippets = [...ownSnippetsList, ...sharedSnippetsList]
      
      // Sort by updated_at
      allSnippets.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )

      return NextResponse.json({ 
        snippets: allSnippets,
        contextMenu: false 
      })
    }
  } catch (error) {
    console.error('API Error:', error)
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json({ error: 'Request timeout' }, { status: 408 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database service not available' }, { status: 503 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const apiKey = authHeader.substring(7)
    const { title, content, system_role, is_public } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    // Validate API key with timeout
    const keyPromise = supabaseAdmin
      .from('user_api_keys')
      .select('user_id, is_active, expires_at')
      .eq('api_key', apiKey)
      .single()

    const { data: apiKeyData, error: keyError } = await Promise.race([
      keyPromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
    ]) as SupabaseResponse<ApiKeyData>

    if (keyError || !apiKeyData) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    if (!apiKeyData.is_active) {
      return NextResponse.json({ error: 'API key is inactive' }, { status: 401 })
    }

    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'API key has expired' }, { status: 401 })
    }

    // Update last used timestamp with timeout
    const updatePromise = supabaseAdmin
      .from('user_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('api_key', apiKey)

    await Promise.race([
      updatePromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
    ])

    // Check snippet limits
    const countPromise = supabaseAdmin
      .from('snippets')
      .select('id')
      .eq('user_id', apiKeyData.user_id)

    const { data: existingSnippets, error: countError } = await Promise.race([
      countPromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
    ]) as SupabaseResponse<{ id: string }[]>

    if (countError) {
      console.error('Error counting snippets:', countError)
      return NextResponse.json({ error: 'Failed to create snippet' }, { status: 500 })
    }

    if (existingSnippets && existingSnippets.length >= TOTAL_SNIPPET_LIMIT) {
      return NextResponse.json({ error: `Maximum ${TOTAL_SNIPPET_LIMIT} snippets allowed` }, { status: 400 })
    }

    // Create new snippet
    const insertPromise = supabaseAdmin
      .from('snippets')
      .insert([{
        title,
        content,
        system_role: system_role || 'user',
        is_public: is_public || false,
        user_id: apiKeyData.user_id
      }])
      .select()
      .single()

    const { data: newSnippet, error: insertError } = await Promise.race([
      insertPromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
    ]) as SupabaseResponse<SnippetData>

    if (insertError) {
      console.error('Error creating snippet:', insertError)
      return NextResponse.json({ error: 'Failed to create snippet' }, { status: 500 })
    }

    return NextResponse.json({ snippet: newSnippet })
  } catch (error) {
    console.error('API Error:', error)
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json({ error: 'Request timeout' }, { status: 408 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 