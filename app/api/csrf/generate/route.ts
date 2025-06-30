import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { generateCSRFToken } from '@/lib/csrf'

// Type for Supabase auth response
interface SupabaseAuthResponse {
  data: {
    user: {
      id: string
      email?: string
    } | null
  }
  error: unknown
}

export async function GET(request: NextRequest) {
  // Debug: print all cookies received
  console.log('CSRF /api/csrf/generate cookies:', request.cookies.getAll());

  // Check for required environment variables first
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ 
      error: 'Service configuration error' 
    }, { status: 503 })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

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
    
    // Get user from token with timeout
    const { data: { user: tokenUser }, error: tokenError } = await Promise.race([
      supabaseWithToken.auth.getUser(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 5000))
    ]) as SupabaseAuthResponse
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
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
        auth: {
          persistSession: true,
          storageKey: 'clickmemory-auth'
        }
      }
    )
    
    // Get the authenticated user with timeout
    const { data: { user: cookieUser }, error: cookieError } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 5000))
    ]) as SupabaseAuthResponse
    user = cookieUser
    authError = cookieError
  }
  
  if (authError) {
    console.error('CSRF auth error:', authError)
    return NextResponse.json({ 
      error: 'Authentication failed' 
    }, { status: 401 })
  }
  
  if (!user) {
    console.error('CSRF: No user found in session')
    return NextResponse.json({ 
      error: 'Not authenticated' 
    }, { status: 401 })
  }

  // Generate CSRF token for the user
  const csrfToken = generateCSRFToken(user.id)
  
  return NextResponse.json({ 
    csrfToken,
    message: 'CSRF token generated successfully'
  })
} 