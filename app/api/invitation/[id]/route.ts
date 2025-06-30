import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database service not available' }, { status: 503 })
    }

    const { id } = await params
    const email = request.nextUrl.searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 })
    }

    // Get pending share
    const { data: pendingShare, error: pendingError } = await supabaseAdmin
      .from('pending_shares')
      .select('*')
      .eq('snippet_id', id)
      .eq('email', email)
      .single()

    if (pendingError || !pendingShare) {
      return NextResponse.json({ error: 'Invitation not found or expired' }, { status: 404 })
    }

    // Check if invitation has expired
    if (pendingShare.expires_at && new Date(pendingShare.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
    }

    // Get snippet details
    const { data: snippet, error: snippetError } = await supabaseAdmin
      .from('snippets')
      .select('*')
      .eq('id', id)
      .single()

    if (snippetError || !snippet) {
      return NextResponse.json({ error: 'Snippet not found' }, { status: 404 })
    }

    return NextResponse.json({
      snippet,
      pendingShare
    })
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 