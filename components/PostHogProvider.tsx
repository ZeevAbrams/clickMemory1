'use client'
import { useEffect } from 'react'
import posthog from 'posthog-js'

interface PostHogProviderProps {
  children: React.ReactNode
}

export default function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    // Initialize PostHog only on client side
    if (typeof window !== 'undefined') {
      const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
      const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
      
      if (posthogKey) {
        posthog.init(posthogKey, {
          api_host: posthogHost,
          loaded: (posthog) => {
            // Disable debug mode completely
            posthog.debug(false)
          },
          capture_pageview: false, // We'll handle this manually
          capture_pageleave: false, // We'll handle this manually
          disable_session_recording: true, // Disable session recording completely
          disable_persistence: false,
          autocapture: false, // Disable autocapture to reduce noise
        })
      }
    }
  }, [])

  return <>{children}</>
} 