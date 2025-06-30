import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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
    const { id } = await params
    
    // Check for Bearer token in Authorization header
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization header with Bearer token required' 
      }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Use the existing supabaseAdmin client for token verification
    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'Service configuration error' 
      }, { status: 503 })
    }
    
    // Get user from token with timeout
    const { data: { user }, error: authError } = await Promise.race([
      supabaseAdmin.auth.getUser(token),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 5000))
    ]) as SupabaseAuthResponse
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Invalid or expired token. Please log in again.' 
      }, { status: 401 })
    }

    // Use the existing supabaseAdmin client for database operations
    const { error } = await Promise.race([
      supabaseAdmin
        .from('user_api_keys')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
    ]) as SupabaseDatabaseResponse<unknown>

    if (error) {
      console.error('Error deleting API key:', error)
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
    console.error('[API keys/DELETE] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 