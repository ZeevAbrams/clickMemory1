import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validateRequest } from '@/lib/validation'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // 1. Validate the user's session and CSRF token
    const { user, error: validationError } = await validateRequest(request)
    if (validationError || !user) {
      // For CSRF errors, use 403 Forbidden. For auth errors, use 401 Unauthorized.
      const status = validationError && validationError.includes('CSRF') ? 403 : 401
      return NextResponse.json({ error: validationError || 'Authentication failed' }, { status })
    }

    // 2. Parse the request body for the key name
    const { name } = await request.json()
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'API key name is required' }, { status: 400 })
    }

    // 3. Generate the new API key
    const apiKey = `cm_${crypto.randomBytes(32).toString('hex')}`
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1) // Expires in 1 year

    // 4. Insert the new key into the database
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service configuration error' }, { status: 503 })
    }
    const { error: insertError } = await supabaseAdmin
      .from('user_api_keys')
      .insert({
        user_id: user.id,
        api_key: apiKey,
        name: name.trim(),
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error creating API key:', insertError)
      return NextResponse.json({ error: 'Failed to create API key in database.' }, { status: 500 })
    }

    // 5. Return the new key to the user
    return NextResponse.json({ api_key: apiKey })
  } catch (e) {
    console.error('Unexpected error in generateApiKey:', e)
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 })
  }
} 