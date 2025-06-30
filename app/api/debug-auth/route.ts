import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({
      request,
    })
    
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
    
    // Get session info
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Get all cookies for debugging
    const allCookies = request.cookies.getAll()
    const authCookies = allCookies.filter(cookie => 
      cookie.name.includes('clickmemory') || 
      cookie.name.includes('supabase') ||
      cookie.name.includes('auth')
    )
    
    return NextResponse.json({
      session: session ? {
        access_token: session.access_token ? 'present' : 'missing',
        refresh_token: session.refresh_token ? 'present' : 'missing',
        expires_at: session.expires_at,
        expires_in: session.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000) : null
      } : null,
      user: user ? {
        id: user.id,
        email: user.email
      } : null,
      errors: {
        sessionError: sessionError?.message,
        userError: userError?.message
      },
      cookies: authCookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value ? 'present' : 'missing'
      })),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 