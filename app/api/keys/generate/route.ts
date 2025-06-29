import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { validateCSRFToken } from '@/lib/csrf'

// Simple in-memory rate limiting (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 5 // Max 5 API key generations per minute per user
  
  const userLimit = rateLimitMap.get(userId)
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (userLimit.count >= maxRequests) {
    return false
  }
  
  userLimit.count++
  return true
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  
  // Check for Bearer token in Authorization header
  const authHeader = request.headers.get('Authorization')
  let user = null
  let authError = null
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    
    // Create a Supabase client with the token
    const supabaseWithToken = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    
    // Get user from token
    const { data: { user: tokenUser }, error: tokenError } = await supabaseWithToken.auth.getUser()
    user = tokenUser
    authError = tokenError
  } else {
    // Fallback to cookie-based authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    
    // First try to get the session
    await supabase.auth.getSession()
    // Get the authenticated user
    const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser()
    user = cookieUser
    authError = cookieError
  }
  
  if (authError || !user) {
    return NextResponse.json({ 
      error: 'Not authenticated. Please log in again.' 
    }, { status: 401 })
  }

  // Check rate limit
  if (!checkRateLimit(user.id)) {
    return NextResponse.json({ 
      error: 'Rate limit exceeded. Please wait before generating another API key.' 
    }, { status: 429 })
  }

  // Validate CSRF token for cookie-based authentication
  if (!authHeader) {
    const csrfToken = request.headers.get('X-CSRF-Token')
    if (!csrfToken || !validateCSRFToken(user.id, csrfToken)) {
      return NextResponse.json({ 
        error: 'Invalid CSRF token. Please refresh the page and try again.' 
      }, { status: 403 })
    }
  }

  // Create Supabase client with service role key for admin operations
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Generate API key
  const apiKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`
  
  // Store in database
  const { error } = await supabaseAdmin
    .from('user_api_keys')
    .insert({
      user_id: user.id,
      api_key: apiKey,
      name: 'Chrome Extension',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json({ 
      error: 'Failed to generate API key. Please try again.' 
    }, { status: 500 })
  }

  return NextResponse.json({ 
    api_key: apiKey,
    message: 'API key generated successfully. Copy this key to your Chrome extension.'
  })
} 