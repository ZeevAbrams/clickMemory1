import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { generateCSRFToken } from '@/lib/csrf'

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

  // Check if we're in production
  const isProduction = process.env.NODE_ENV === 'production'

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
          cookiesToSet.forEach(({ name, value, options }) => {
            // Production-specific cookie options
            const cookieOptions = isProduction ? {
              ...options,
              secure: true,
              sameSite: 'lax' as const,
              path: '/',
              domain: process.env.NEXT_PUBLIC_DOMAIN || undefined
            } : options
            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
        },
      },
      auth: {
        persistSession: true,
        storageKey: 'clickmemory-auth',
        // Production-specific settings
        ...(isProduction && {
          cookieOptions: {
            name: 'clickmemory-auth',
            lifetime: 60 * 60 * 8, // 8 hours
            domain: process.env.NEXT_PUBLIC_DOMAIN || undefined,
            path: '/',
            sameSite: 'lax' as const,
            secure: true
          }
        })
      }
    }
  )

  try {
    // Check for Bearer token in Authorization header first
    const authHeader = request.headers.get('Authorization')
    let user = null
    let authError = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      console.log('CSRF: Using Bearer token authentication')
      
      // Create admin client for token verification
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { user: tokenUser }, error: tokenError } = await adminClient.auth.getUser(token)
      user = tokenUser
      authError = tokenError
    } else {
      // Fall back to cookie-based authentication
      console.log('CSRF: Using cookie-based authentication')
      const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser()
      user = cookieUser
      authError = cookieError
    }

    if (authError) {
      console.log('CSRF auth error:', authError)
      return NextResponse.json({ 
        error: 'Authentication failed' 
      }, { status: 401 })
    }

    if (!user) {
      console.log('CSRF: No user found')
      return NextResponse.json({ 
        error: 'User not authenticated' 
      }, { status: 401 })
    }

    // Generate CSRF token
    const csrfToken = generateCSRFToken(user.id)
    
    return NextResponse.json({ 
      csrfToken,
      user: {
        id: user.id,
        email: user.email
      }
    })

  } catch (error) {
    console.error('CSRF generation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 