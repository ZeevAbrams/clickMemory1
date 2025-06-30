import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

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

export async function POST(request: NextRequest) {
  try {
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

    // Parse request body
    const { name } = await request.json()
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        error: 'API key name is required' 
      }, { status: 400 })
    }

    // Use the existing supabaseAdmin client for database operations
    // Generate API key
    const apiKey = `cm_${crypto.randomBytes(32).toString('hex')}`
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1 year from now
    
    // Insert the new API key with timeout
    const { data: newKey, error } = await Promise.race([
      supabaseAdmin
        .from('user_api_keys')
        .insert({
          user_id: user.id,
          name: name.trim(),
          api_key: apiKey,
          is_active: true,
          expires_at: expiresAt.toISOString()
        })
        .select('id, name, api_key, created_at, expires_at')
        .single(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
    ]) as SupabaseDatabaseResponse<{ id: string; name: string; api_key: string; created_at: string; expires_at: string }>

    if (error) {
      console.error('Error creating API key:', error)
      return NextResponse.json({ 
        error: 'Failed to create API key' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      api_key: newKey,
      message: 'API key created successfully' 
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json({ error: 'Request timeout' }, { status: 408 })
    }
    console.error('[API keys/POST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 