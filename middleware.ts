import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    // Simple middleware that only handles routing
    // Session management is handled by the client-side AuthContext
    
    // For API routes, let them handle their own authentication
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.next()
    }
    
    // For page routes, just continue to the page
    // The AuthContext will handle session validation and redirects
    return NextResponse.next()
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