import { PostHog } from 'posthog-node'

// Server-side PostHog instance - only create if key is available
let posthogServer: PostHog | null = null

if (process.env.POSTHOG_KEY) {
  try {
    posthogServer = new PostHog(
      process.env.POSTHOG_KEY,
      {
        host: process.env.POSTHOG_HOST || 'https://app.posthog.com'
      }
    )
  } catch (error) {
    console.warn('Failed to initialize PostHog server instance:', error)
  }
}

// Helper function to identify user
export const identifyUser = (userId: string, email?: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    // Only run on client side
    import('posthog-js').then((posthog) => {
      const client = posthog.default
      client.identify(userId, {
        email,
        ...properties
      })
    })
  }
}

// Helper function to track events
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  console.log('🎯 Tracking event:', eventName, properties) // Debug log
  
  if (typeof window !== 'undefined') {
    // Only run on client side
    import('posthog-js').then((posthog) => {
      const client = posthog.default
      console.log('📊 PostHog client loaded, sending event...') // Debug log
      client.capture(eventName, properties)
    }).catch(error => {
      console.error('❌ PostHog client error:', error) // Debug log
    })
  }
}

// Helper function for server-side tracking
export const trackServerEvent = (eventName: string, userId: string, properties?: Record<string, any>) => {
  console.log('🖥️ Tracking server event:', eventName, { userId, properties }) // Debug log
  
  if (posthogServer) {
    try {
      posthogServer.capture({
        distinctId: userId,
        event: eventName,
        properties
      })
      console.log('✅ Server event sent successfully') // Debug log
    } catch (error) {
      console.warn('❌ Failed to track server event:', error)
    }
  } else {
    console.warn('⚠️ PostHog server not initialized')
  }
}