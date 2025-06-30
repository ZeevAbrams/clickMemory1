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

    // Simple session check for page navigation (not API routes)
    // API routes use Bearer token authentication
    if (!request.nextUrl.pathname.startsWith('/api/')) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        // Only log session status for debugging
        if (session?.access_token) {
          const expiresAt = session.expires_at
          if (expiresAt) {
            const now = Math.floor(Date.now() / 1000)
            const timeUntilExpiry = expiresAt - now
            
            // Log if session is close to expiring but don't refresh automatically
            if (timeUntilExpiry < 300) {
              console.log('Middleware: Session expires soon, but letting client handle refresh')
            }
          }
        }
      } catch (sessionError) {
        console.error('Middleware: Session check failed:', sessionError)
        // Continue without session - don't block the request
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