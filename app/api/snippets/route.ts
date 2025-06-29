import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { validateSnippetData, containsSqlInjection } from '@/lib/validation'
import { CONTEXT_MENU_SNIPPET_LIMIT, TOTAL_SNIPPET_LIMIT } from '@/lib/snippetIdeas'
import { trackServerEvent } from '@/lib/posthog'

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
  if (!apiKey.startsWith('sk_live_') || apiKey.length !== 72) {
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

    if (keyError) {
      console.error('API key lookup error:', keyError);
      return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 })
    }

    if (!apiKeyData) {
      console.error('API key not found in database');
      return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 })
    }

    // Check if API key is expired
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      console.error('API key expired:', apiKeyData.expires_at);
      return NextResponse.json({ error: 'API key has expired' }, { status: 401 })
    }

    console.log('API key validated successfully for user:', apiKeyData.user_id);

    // Track API request
    trackServerEvent('api_request_made', apiKeyData.user_id, {
      endpoint: '/api/snippets',
      method: 'GET',
      hasContextMenuParam: !!contextMenu
    })

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
        .limit(CONTEXT_MENU_SNIPPET_LIMIT)

      if (contextError) {
        console.error('Error fetching context menu snippets:', contextError)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      // Track successful response
      trackServerEvent('snippets_fetched', apiKeyData.user_id, {
        snippetCount: contextSnippets?.length || 0,
        contextMenuOnly: true,
        includeShared: false
      })

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
      console.error('Error fetching own snippets:', ownError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log('Fetched own snippets count:', ownSnippets?.length || 0);

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
      console.error('Error fetching shared snippets:', sharedError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log('Fetched shared snippets count:', sharedSnippets?.length || 0);
    console.log('Shared snippets data structure:', JSON.stringify(sharedSnippets, null, 2));

    // Process shared snippets
    const processedSharedSnippets: SnippetData[] = (sharedSnippets as SharedSnippetData[] || [])
      .filter(share => {
        const isValid = share.snippets && share.snippets.length > 0;
        if (!isValid) {
          console.log('Filtering out orphaned shared snippet record:', share);
        }
        return isValid;
      })
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

    // Track successful response
    trackServerEvent('snippets_fetched', apiKeyData.user_id, {
      snippetCount: allSnippets.length,
      contextMenuOnly: false,
      includeShared: true,
      ownCount: ownSnippets?.length || 0,
      sharedCount: processedSharedSnippets.length
    })

    return NextResponse.json({
      snippets: allSnippets,
      total_count: allSnippets.length,
      own_count: ownSnippets?.length || 0,
      shared_count: processedSharedSnippets.length
    })

  } catch (error) {
    console.error('Error in snippets API:', error)
    
    // Track error
    trackServerEvent('api_error', 'unknown', {
      endpoint: '/api/snippets',
      method: 'GET',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
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
  if (!apiKey.startsWith('sk_live_') || apiKey.length !== 72) {
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
      console.error('API key validation failed:', keyError);
      return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 })
    }

    // Check if API key is expired
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      console.error('API key expired:', apiKeyData.expires_at);
      return NextResponse.json({ error: 'API key has expired' }, { status: 401 })
    }

    // Track API request
    trackServerEvent('api_request_made', apiKeyData.user_id, {
      endpoint: '/api/snippets',
      method: 'POST'
    })

    // Update last used timestamp
    await supabase
      .from('user_api_keys')
      .update({ last_used_at: new Date() })
      .eq('api_key', apiKey)

    // Parse and validate request body
    const body = await request.json()
    
    // Validate snippet data
    const validationResult = validateSnippetData(body)
    if (!validationResult.isValid) {
      return NextResponse.json({ error: validationResult.errors.join(', ') }, { status: 400 })
    }

    // Check for SQL injection
    if (containsSqlInjection(body.title) || containsSqlInjection(body.content)) {
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
    }

    // Check snippet limits
    const { data: existingSnippets, error: countError } = await supabase
      .from('snippets')
      .select('id')
      .eq('user_id', apiKeyData.user_id)

    if (countError) {
      console.error('Error counting snippets:', countError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (existingSnippets && existingSnippets.length >= TOTAL_SNIPPET_LIMIT) {
      return NextResponse.json({ 
        error: `Maximum ${TOTAL_SNIPPET_LIMIT} snippets allowed in the free version. Please delete some snippets first.` 
      }, { status: 400 })
    }

    // Create the snippet
    const { data: newSnippet, error: insertError } = await supabase
      .from('snippets')
      .insert([{
        title: body.title.trim(),
        system_role: body.system_role?.trim() || null,
        content: body.content.trim(),
        user_id: apiKeyData.user_id
      }])
      .select()
      .single()

    if (insertError) {
      console.error('Error creating snippet:', insertError)
      return NextResponse.json({ error: 'Failed to create snippet' }, { status: 500 })
    }

    // Track successful creation
    trackServerEvent('snippet_created_via_api', apiKeyData.user_id, {
      snippetId: newSnippet.id,
      title: newSnippet.title,
      hasSystemRole: !!newSnippet.system_role
    })

    return NextResponse.json({ snippet: newSnippet })
  } catch (error) {
    console.error('Error in snippets POST API:', error)
    
    // Track error
    trackServerEvent('api_error', 'unknown', {
      endpoint: '/api/snippets',
      method: 'POST',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 