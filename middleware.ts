import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
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
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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
              sameSite: 'lax',
              secure: true
            }
          })
        }
      }
    )

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Middleware timeout')), 5000)
    })

    // Get and refresh session with timeout
    const sessionPromise = supabase.auth.getSession()
    
    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any
    
    // If session exists but is close to expiring, refresh it
    if (session?.access_token) {
      const expiresAt = session.expires_at
      const now = Math.floor(Date.now() / 1000)
      const timeUntilExpiry = expiresAt - now
      
      // Refresh if session expires in less than 5 minutes
      if (timeUntilExpiry < 300) {
        try {
          const refreshPromise = supabase.auth.refreshSession()
          await Promise.race([refreshPromise, timeoutPromise])
        } catch (refreshError) {
          console.error('Session refresh failed:', refreshError)
          // Continue with existing session even if refresh fails
        }
      }
    }

    return supabaseResponse
  } catch (error) {
    console.error('Middleware error:', error)
    // Return a basic response if middleware fails - don't hang the request
    return NextResponse.next({
      request,
    })
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 