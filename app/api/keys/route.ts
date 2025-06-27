import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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

  // Create Supabase client with service role key for admin operations
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const { data: apiKeys, error } = await supabaseAdmin
    .from('user_api_keys')
    .select('id, name, is_active, last_used_at, created_at, expires_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch API keys' 
    }, { status: 500 })
  }

  return NextResponse.json({ api_keys: apiKeys || [] })
} 