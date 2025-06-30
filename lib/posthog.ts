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
export const identifyUser = (userId: string, email?: string, properties?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    // Only run on client side
    import('posthog-js').then((posthog) => {
      const client = posthog.default
      try {
        client.identify(userId, {
          email,
          ...properties
        })
      } catch (error) {
        console.error('PostHog identify error:', error)
      }
    }).catch(error => {
      console.error('PostHog client error:', error)
    })
  }
}

// Helper function to track events
export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    // Only run on client side
    import('posthog-js').then((posthog) => {
      const client = posthog.default
      try {
        client.capture(eventName, properties)
      } catch (error) {
        console.error('PostHog capture error:', error)
      }
    }).catch(error => {
      console.error('PostHog client error:', error)
    })
  }
}

// Helper function for server-side tracking
export const trackServerEvent = (eventName: string, userId: string, properties?: Record<string, unknown>) => {
  if (posthogServer) {
    try {
      posthogServer.capture({
        distinctId: userId,
        event: eventName,
        properties
      })
    } catch (error) {
      console.error('Failed to track server event:', error)
    }
  } else {
    // Optionally, you can log this as an error if needed
  }
}