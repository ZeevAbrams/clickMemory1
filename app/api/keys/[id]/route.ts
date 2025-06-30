import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

// Type for Supabase database response
interface SupabaseDatabaseResponse<T> {
  data: T | null
  error: unknown
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let supabaseResponse = NextResponse.next({
      request,
    })
    const { id } = await params
    
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
    
    // Verify the API key belongs to the user with timeout
    const verifyPromise = supabaseAdmin
      .from('user_api_keys')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const { data: apiKeyData, error: keyError } = await Promise.race([
      verifyPromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
    ]) as SupabaseDatabaseResponse<{ id: string }>

    if (keyError || !apiKeyData) {
      return NextResponse.json({ 
        error: 'API key not found or access denied' 
      }, { status: 404 })
    }

    // Delete the API key with timeout
    const deletePromise = supabaseAdmin
      .from('user_api_keys')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    const { error: deleteError } = await Promise.race([
      deletePromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
    ]) as SupabaseDatabaseResponse<unknown>

    if (deleteError) {
      console.error('Error deleting API key:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete API key' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'API key deleted successfully' 
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json({ error: 'Request timeout' }, { status: 408 })
    }
    console.error(`[API keys/DELETE] Error deleting key ${await (await params).id}:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 