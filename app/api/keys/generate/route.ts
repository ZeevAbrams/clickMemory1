import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase'

// Simple in-memory rate limiting (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60000 }) // 1 minute window
    return true
  }
  
  if (userLimit.count >= 5) { // Max 5 API keys per minute
    return false
  }
  
  userLimit.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('Supabase admin client not available - missing environment variables')
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
    }

    // Get the auth token from the request
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!authToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }

    // Create a Supabase client with the user's token
    const supabaseWithToken = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      }
    )

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseWithToken.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please wait before generating another API key.' 
      }, { status: 429 })
    }

    // Parse request body
    const { name = 'Chrome Extension' } = await request.json()

    // Validate name
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (name.length > 50) {
      return NextResponse.json({ error: 'Name must be 50 characters or less' }, { status: 400 })
    }

    // Generate API key
    const apiKey = `sk_live_${generateRandomString(64)}`
    
    // Set expiration to 1 year from now
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    // Insert the API key into the database
    const { data: newApiKey, error: insertError } = await supabaseAdmin
      .from('user_api_keys')
      .insert([{
        user_id: user.id,
        api_key: apiKey,
        name: name.trim(),
        is_active: true,
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single()

    if (insertError) {
      console.error('Error creating API key:', insertError)
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
    }

    return NextResponse.json({ 
      apiKey: newApiKey.api_key,
      name: newApiKey.name,
      expiresAt: newApiKey.expires_at
    })
  } catch (error) {
    console.error('Error generating API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
} 