import { NextRequest, NextResponse } from 'next/server'
import { generateCSRFToken } from '@/lib/csrf'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  // Check for required environment variables first
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ 
      error: 'Service configuration error' 
    }, { status: 503 })
  }

  try {
    // Check for Bearer token in Authorization header
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization header with Bearer token required' 
      }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    console.log('CSRF: Using Bearer token authentication')
    
    // Use the existing supabaseAdmin client for token verification
    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'Service configuration error' 
      }, { status: 503 })
    }
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

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
    const csrfToken = await generateCSRFToken(user.id)
    
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