import { createClient } from '@supabase/supabase-js'

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.warn('NEXT_PUBLIC_SUPABASE_URL environment variable is missing. Please check your environment configuration.')
}

if (!supabaseAnonKey) {
  console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is missing. Please check your environment configuration.')
}

// Server-side admin client for API routes only
// This is the ONLY client created in this file
export const supabaseAdmin = (() => {
  if (!supabaseUrl || !(supabaseServiceKey || supabaseAnonKey)) return null
  
  return createClient(
    supabaseUrl,
    (supabaseServiceKey || supabaseAnonKey)!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )
})() 