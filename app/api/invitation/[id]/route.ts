import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const snippetId = params.id

    if (!email || !snippetId) {
      return NextResponse.json(
        { error: 'Missing email or snippet ID' },
        { status: 400 }
      )
    }

    // Fetch the snippet
    const { data: snippetData, error: snippetError } = await supabaseAdmin
      .from('snippets')
      .select('*')
      .eq('id', snippetId)
      .single()

    if (snippetError) {
      console.error('Snippet error:', snippetError)
      return NextResponse.json(
        { error: 'Snippet not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch pending share
    const { data: pendingData, error: pendingError } = await supabaseAdmin
      .from('pending_shares')
      .select('*')
      .eq('snippet_id', snippetId)
      .eq('email', email)
      .single()

    if (pendingError) {
      console.error('Pending share error:', pendingError)
      return NextResponse.json(
        { error: 'Invitation not found or expired' },
        { status: 404 }
      )
    }

    // Check if invitation has expired
    if (new Date(pendingData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    return NextResponse.json({
      snippet: snippetData,
      pendingShare: pendingData
    })

  } catch (error) {
    console.error('Error fetching invitation data:', error)
    return NextResponse.json(
      { error: 'Failed to load invitation' },
      { status: 500 }
    )
  }
} 