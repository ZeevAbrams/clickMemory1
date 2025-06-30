import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const apiKey = authHeader.substring(7)
    const contextMenu = request.nextUrl.searchParams.get('context_menu') === 'true'

    // Validate API key
    const { data: apiKeyData, error: keyError } = await supabaseAdmin
      .from('user_api_keys')
      .select('user_id, is_active, expires_at')
      .eq('api_key', apiKey)
      .single()

    if (keyError || !apiKeyData) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    if (!apiKeyData.is_active) {
      return NextResponse.json({ error: 'API key is inactive' }, { status: 401 })
    }

    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'API key has expired' }, { status: 401 })
    }

    // Update last used timestamp
    await supabaseAdmin
      .from('user_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('api_key', apiKey)

    // Fetch snippets based on context menu parameter
    if (contextMenu) {
      // Only fetch public snippets for context menu
      const { data: contextSnippets, error: contextError } = await supabaseAdmin
        .from('snippets')
        .select('id, title, content, system_role, is_public')
        .eq('user_id', apiKeyData.user_id)
        .eq('is_public', true)
        .order('updated_at', { ascending: false })

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
      const { data: ownSnippets, error: ownError } = await supabaseAdmin
        .from('snippets')
        .select('*')
        .eq('user_id', apiKeyData.user_id)
        .order('updated_at', { ascending: false })

      if (ownError) {
        console.error('Error fetching own snippets:', ownError)
        return NextResponse.json({ error: 'Failed to fetch snippets' }, { status: 500 })
      }

      // Fetch shared snippets
      const { data: sharedSnippets, error: sharedError } = await supabaseAdmin
        .from('shared_snippets')
        .select(`
          snippet_id,
          permission,
          snippets (*)
        `)
        .eq('shared_with_user_id', apiKeyData.user_id)

      if (sharedError) {
        console.error('Error fetching shared snippets:', sharedError)
        return NextResponse.json({ error: 'Failed to fetch snippets' }, { status: 500 })
      }

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

      return NextResponse.json({ 
        snippets: allSnippets,
        contextMenu: false 
      })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const apiKey = authHeader.substring(7)
    const { title, content, system_role, is_public } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    // Validate API key
    const { data: apiKeyData, error: keyError } = await supabaseAdmin
      .from('user_api_keys')
      .select('user_id, is_active, expires_at')
      .eq('api_key', apiKey)
      .single()

    if (keyError || !apiKeyData) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    if (!apiKeyData.is_active) {
      return NextResponse.json({ error: 'API key is inactive' }, { status: 401 })
    }

    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'API key has expired' }, { status: 401 })
    }

    // Update last used timestamp
    await supabaseAdmin
      .from('user_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('api_key', apiKey)

    // Check snippet limits
    const { data: existingSnippets, error: countError } = await supabaseAdmin
      .from('snippets')
      .select('id')
      .eq('user_id', apiKeyData.user_id)

    if (countError) {
      console.error('Error counting snippets:', countError)
      return NextResponse.json({ error: 'Failed to create snippet' }, { status: 500 })
    }

    if (existingSnippets && existingSnippets.length >= 20) {
      return NextResponse.json({ error: 'Maximum 20 snippets allowed' }, { status: 400 })
    }

    // Create new snippet
    const { data: newSnippet, error: insertError } = await supabaseAdmin
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

    if (insertError) {
      console.error('Error creating snippet:', insertError)
      return NextResponse.json({ error: 'Failed to create snippet' }, { status: 500 })
    }

    return NextResponse.json({ snippet: newSnippet })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 