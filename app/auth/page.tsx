'use client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useSupabase } from '@/contexts/SupabaseContext'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import Image from 'next/image'

function AuthPageContent() {
  const { supabase, loading: supabaseLoading } = useSupabase()
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [redirectTo, setRedirectTo] = useState<string>('')

  useEffect(() => {
    if (user) {
      // Check if user came from an invitation page
      const returnTo = searchParams.get('returnTo')
      if (returnTo) {
        router.push(returnTo)
      } else {
        router.push('/dashboard')
      }
    }
  }, [user, router, searchParams])

  useEffect(() => {
    // Set redirectTo after component mounts to avoid window is not defined error
    setRedirectTo(`${window.location.origin}/dashboard`)
  }, [])

  // Check if supabase client is available
  if (supabaseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-secondary-light p-4">
        <div className="max-w-md w-full space-y-8 p-10 bg-gradient-card rounded-3xl shadow-glow border border-custom">
          <div className="text-center">
            <Image src="/FullImage_clickMemory.png" alt="ClickMemory logo" className="mx-auto mb-4 w-20 h-20 rounded-2xl shadow-glow" width={80} height={80} />
            <h2 className="text-4xl font-bold text-primary mb-2">ClickMemory</h2>
            <p className="text-secondary text-lg">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-secondary-light p-4">
        <div className="max-w-md w-full space-y-8 p-10 bg-gradient-card rounded-3xl shadow-glow border border-custom">
          <div className="text-center">
            <Image src="/FullImage_clickMemory.png" alt="ClickMemory logo" className="mx-auto mb-4 w-20 h-20 rounded-2xl shadow-glow" width={80} height={80} />
            <h2 className="text-4xl font-bold text-primary mb-2">ClickMemory</h2>
            <p className="text-secondary text-lg">Service temporarily unavailable</p>
            <p className="text-red-500 text-sm mt-2">Please try again later or contact support.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-secondary-light p-4">
      <div className="max-w-md w-full space-y-8 p-10 bg-gradient-card rounded-3xl shadow-glow border border-custom">
        <div className="text-center">
          <Image src="/FullImage_clickMemory.png" alt="ClickMemory logo" className="mx-auto mb-4 w-20 h-20 rounded-2xl shadow-glow" width={80} height={80} />
          <h2 className="text-4xl font-bold text-primary mb-2">ClickMemory</h2>
          <p className="text-secondary text-lg">Sign in to manage your snippets</p>
        </div>
        {redirectTo && (
          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              className: {
                button: 'px-6 py-3 rounded-2xl bg-gradient-primary hover:bg-primary-hover text-white font-semibold shadow-glow hover-lift transition-all',
                input: 'rounded-xl border-custom bg-card text-text-primary px-4 py-3 shadow-card focus:ring-2 focus:ring-primary focus:border-primary transition-all',
                label: 'text-text-primary font-medium',
                anchor: 'text-primary hover:text-primary-hover transition-colors'
              }
            }}
            providers={[]}
            redirectTo={redirectTo}
          />
        )}
        
        {/* Terms and Privacy Links */}
        <div className="text-center mt-8 pt-6 border-t border-custom/20">
          <div className="flex justify-center items-center gap-6 text-xs text-secondary">
            <a 
              href="/terms" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Terms & Conditions
            </a>
            <span className="text-custom/40">•</span>
            <a 
              href="/privacy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-secondary-light p-4">
        <div className="max-w-md w-full space-y-8 p-10 bg-gradient-card rounded-3xl shadow-glow border border-custom">
          <div className="text-center">
            <Image src="/FullImage_clickMemory.png" alt="ClickMemory logo" className="mx-auto mb-4 w-20 h-20 rounded-2xl shadow-glow" width={80} height={80} />
            <h2 className="text-4xl font-bold text-primary mb-2">ClickMemory</h2>
            <p className="text-secondary text-lg">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  )
} 