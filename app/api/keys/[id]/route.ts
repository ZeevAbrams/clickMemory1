import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validateRequest } from '@/lib/validation'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Validate the user's session and CSRF token
    const { user, error: validationError } = await validateRequest(request)
    if (validationError || !user) {
      const status = validationError && validationError.includes('CSRF') ? 403 : 401
      return NextResponse.json({ error: validationError || 'Authentication failed' }, { status })
    }

    // 2. Get the key ID from the URL parameters
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'API key ID is missing.' }, { status: 400 })
    }

    // 3. Delete the key from the database, ensuring it belongs to the user
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service configuration error' }, { status: 503 })
    }
    const { error: deleteError } = await supabaseAdmin
      .from('user_api_keys')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Critical check to prevent deleting other users' keys

    if (deleteError) {
      console.error('Error deleting API key:', deleteError)
      return NextResponse.json({ error: 'Failed to delete API key from database.' }, { status: 500 })
    }

    // 4. Return a success message
    return NextResponse.json({ message: 'API key deleted successfully' })

  } catch (e) {
    console.error('Unexpected error in deleteApiKey:', e)
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 })
  }
} 