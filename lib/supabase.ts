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

// Only create clients if required environment variables are available
export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,
    storageKey: 'clickmemory-auth',
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
}) : null

// Server-side admin client for API routes with different storage key
export const supabaseAdmin = supabaseUrl && (supabaseServiceKey || supabaseAnonKey) ? createClient(
  supabaseUrl!,
  (supabaseServiceKey || supabaseAnonKey)!,
  {
    auth: {
      persistSession: false,
      storageKey: 'clickmemory-admin',
      autoRefreshToken: false
    }
  }
) : null 