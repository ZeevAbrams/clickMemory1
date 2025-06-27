import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { validateSnippetData, containsSqlInjection } from '@/lib/validation'

interface SnippetData {
  id: string
  title: string
  content: string
  is_public: boolean
  created_at: string
  updated_at: string
  is_shared?: boolean
  shared_permission?: string
}

interface SharedSnippetData {
  snippet_id: string
  permission: string
  snippets: {
    id: string
    title: string
    content: string
    is_public: boolean
    created_at: string
    updated_at: string
  }[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const contextMenu = searchParams.get('context_menu') === 'true'
  
  // Get API key from Authorization header
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ 
      error: 'Missing or invalid Authorization header. Use format: Bearer YOUR_API_KEY' 
    }, { status: 401 })
  }

  const apiKey = authHeader.replace('Bearer ', '')
  
  // Validate API key format
  if (!apiKey.startsWith('sk_live_') || apiKey.length !== 71) {
    return NextResponse.json({ error: 'Invalid API key format' }, { status: 401 })
  }

  // Create Supabase client with service role key
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Verify API key and get user
    const { data: apiKeyData, error: keyError } = await supabase
      .from('user_api_keys')
      .select('user_id, is_active, expires_at')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()

    if (keyError || !apiKeyData) {
      return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 })
    }

    // Check if API key is expired
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'API key has expired' }, { status: 401 })
    }

    // Update last used timestamp
    await supabase
      .from('user_api_keys')
      .update({ last_used_at: new Date() })
      .eq('api_key', apiKey)

    if (contextMenu) {
      // For context menu, only return public snippets (max 5)
      const { data: contextSnippets, error: contextError } = await supabase
        .from('snippets')
        .select('id, title, content')
        .eq('user_id', apiKeyData.user_id)
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(5)

      if (contextError) {
        console.error('Error fetching context menu snippets:', contextError)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      return NextResponse.json({ 
        snippets: contextSnippets || [],
        total_count: contextSnippets?.length || 0
      })
    }

    // Regular snippets API - fetch all snippets
    // Fetch own snippets
    const { data: ownSnippets, error: ownError } = await supabase
      .from('snippets')
      .select('id, title, content, is_public, created_at, updated_at')
      .eq('user_id', apiKeyData.user_id)
      .order('updated_at', { ascending: false })

    if (ownError) {
      console.error('Error fetching own snippets:', ownError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Fetch shared snippets
    const { data: sharedSnippets, error: sharedError } = await supabase
      .from('shared_snippets')
      .select(`
        snippet_id,
        permission,
        snippets!inner (
          id, title, content, is_public, created_at, updated_at
        )
      `)
      .eq('shared_with_user_id', apiKeyData.user_id)

    if (sharedError) {
      console.error('Error fetching shared snippets:', sharedError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Process shared snippets
    const processedSharedSnippets: SnippetData[] = (sharedSnippets as SharedSnippetData[] || [])
      .map(share => ({
        id: share.snippets[0].id,
        title: share.snippets[0].title,
        content: share.snippets[0].content,
        is_public: share.snippets[0].is_public,
        created_at: share.snippets[0].created_at,
        updated_at: share.snippets[0].updated_at,
        is_shared: true,
        shared_permission: share.permission
      }))

    // Combine and sort snippets
    const allSnippets: SnippetData[] = [...(ownSnippets || []), ...processedSharedSnippets]
    allSnippets.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )

    return NextResponse.json({
      snippets: allSnippets,
      total_count: allSnippets.length,
      own_count: ownSnippets?.length || 0,
      shared_count: processedSharedSnippets.length
    })

  } catch (error) {
    console.error('Error in snippets API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  // Get API key from Authorization header
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ 
      error: 'Missing or invalid Authorization header. Use format: Bearer YOUR_API_KEY' 
    }, { status: 401 })
  }

  const apiKey = authHeader.replace('Bearer ', '')
  
  // Validate API key format
  if (!apiKey.startsWith('sk_live_') || apiKey.length !== 71) {
    return NextResponse.json({ error: 'Invalid API key format' }, { status: 401 })
  }

  // Create Supabase client with service role key
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Verify API key and get user
    const { data: apiKeyData, error: keyError } = await supabase
      .from('user_api_keys')
      .select('user_id, is_active, expires_at')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()

    if (keyError || !apiKeyData) {
      return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 })
    }

    // Check if API key is expired
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'API key has expired' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const { title, content, is_public, system_role } = body

    // Validate input data
    const validation = validateSnippetData({ title, content, system_role })
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.errors 
      }, { status: 400 })
    }

    // Check for SQL injection attempts
    if (containsSqlInjection(title) || containsSqlInjection(content) || (system_role && containsSqlInjection(system_role))) {
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
    }

    // Parse sanitized data
    const sanitizedData = JSON.parse(validation.sanitizedValue!)

    const { data: snippet, error } = await supabase
      .from('snippets')
      .insert([{
        title: sanitizedData.title,
        content: sanitizedData.content,
        system_role: sanitizedData.system_role || null,
        is_public: is_public || false,
        user_id: apiKeyData.user_id
      }])
      .select()
      .single()

    if (error) {
      if (error.message.includes('Maximum 15 snippets')) {
        return NextResponse.json({ 
          error: 'You have reached the maximum limit of 15 snippets. Please delete some snippets first.' 
        }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ snippet })
  } catch (error) {
    console.error('Error creating snippet:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 