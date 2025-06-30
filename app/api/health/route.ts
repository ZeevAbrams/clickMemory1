import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      environment: 'unknown'
    },
    errors: [] as string[]
  }

  try {
    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingEnvVars.length > 0) {
      health.services.environment = 'unhealthy'
      health.errors.push(`Missing environment variables: ${missingEnvVars.join(', ')}`)
    } else {
      health.services.environment = 'healthy'
    }

    // Check database connection
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('profiles').select('count').limit(1)
        health.services.database = 'healthy'
      } catch (dbError) {
        health.services.database = 'unhealthy'
        health.errors.push(`Database connection failed: ${dbError}`)
      }
    } else {
      health.services.database = 'unhealthy'
      health.errors.push('Supabase client not initialized')
    }

    // Determine overall status
    if (health.errors.length > 0) {
      health.status = 'unhealthy'
    }

    const statusCode = health.status === 'healthy' ? 200 : 503

    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    health.status = 'unhealthy'
    health.errors.push(`Health check failed: ${error}`)
    return NextResponse.json(health, { status: 503 })
  }
} 