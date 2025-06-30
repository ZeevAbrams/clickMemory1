import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Check for Bearer token in Authorization header
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization header with Bearer token required' 
      }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    
    // Use the existing supabaseAdmin client for token verification
    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'Service configuration error' 
      }, { status: 503 })
    }
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError) {
      console.log('Test auth error:', authError)
      return NextResponse.json({ 
        error: 'Authentication failed' 
      }, { status: 401 })
    }

    if (!user) {
      console.log('Test: No user found')
      return NextResponse.json({ 
        error: 'User not authenticated' 
      }, { status: 401 })
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      message: 'Authentication working correctly'
    })

  } catch (error) {
    console.error('Test auth error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 