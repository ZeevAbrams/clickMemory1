export interface EmailInvitation {
  to: string
  snippetTitle: string
  snippetId: string
  permission: 'view' | 'edit'
  inviterEmail: string
}

export class EmailService {
  static async sendInvitation(invitation: EmailInvitation): Promise<boolean> {
    try {
      // Get the current user's auth token using centralized session management
      const supabaseModule = await import('@/lib/supabase')
      if (!supabaseModule.supabase) {
        console.error('Supabase client not available')
        return false
      }
      
      const session = await supabaseModule.getSession()
      
      if (!session?.access_token) {
        console.error('No auth token available')
        return false
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: invitation.to,
          snippetTitle: invitation.snippetTitle,
          snippetId: invitation.snippetId,
          permission: invitation.permission,
          inviterEmail: invitation.inviterEmail,
          type: 'invitation',
          authToken: session.access_token
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Email API error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error sending invitation:', error)
      return false
    }
  }

  static async sendShareNotification(
    userEmail: string, 
    snippetTitle: string, 
    permission: 'view' | 'edit',
    inviterEmail: string
  ): Promise<boolean> {
    try {
      // Get the current user's auth token using centralized session management
      const supabaseModule = await import('@/lib/supabase')
      if (!supabaseModule.supabase) {
        console.error('Supabase client not available')
        return false
      }
      
      const session = await supabaseModule.getSession()
      
      if (!session?.access_token) {
        console.error('No auth token available')
        return false
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: userEmail,
          snippetTitle: snippetTitle,
          snippetId: '', // Not needed for notifications
          permission: permission,
          inviterEmail: inviterEmail,
          type: 'notification',
          authToken: session.access_token
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Email API error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error sending notification:', error)
      return false
    }
  }
} 