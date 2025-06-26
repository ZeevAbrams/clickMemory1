import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

// Check for required environment variables
if (!process.env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY is not set')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('NEXT_PUBLIC_SUPABASE_URL is not set')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
}

const resend = new Resend(process.env.RESEND_API_KEY)

// Create Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    // Check if required environment variables are set
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Database service not configured' }, { status: 500 })
    }

    const { to, snippetTitle, snippetId, permission, inviterEmail, type, authToken } = await request.json()

    if (!to || !snippetTitle || !snippetId || !authToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user is authenticated using the auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (type === 'invitation') {
      // Send invitation email to new user
      const { data, error } = await resend.emails.send({
        from: 'za@iteraite.com', // Use your email address
        to: [to],
        subject: `You've been invited to view: ${snippetTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">You've been invited to view a snippet!</h2>
            <p>Hello,</p>
            <p>${inviterEmail} has shared a snippet with you: <strong>${snippetTitle}</strong></p>
            <p>You have <strong>${permission}</strong> permissions for this snippet.</p>
            <div style="margin: 30px 0;">
              <a href="${appUrl}/invite/${snippetId}?email=${encodeURIComponent(to)}&permission=${permission}" 
                 style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Snippet
              </a>
            </div>
            <p>If you don't have an account, you'll be prompted to create one when you click the link above.</p>
            <p>Best regards,<br>The ClickMemory Team</p>
          </div>
        `
      })

      if (error) {
        console.error('Resend error:', error)
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    } else if (type === 'notification') {
      // Send notification email to existing user
      const { data, error } = await resend.emails.send({
        from: 'za@iteraite.com', // Use your email address
        to: [to],
        subject: `Snippet shared with you: ${snippetTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">A snippet has been shared with you!</h2>
            <p>Hello,</p>
            <p>${inviterEmail} has shared a snippet with you: <strong>${snippetTitle}</strong></p>
            <p>You have <strong>${permission}</strong> permissions for this snippet.</p>
            <div style="margin: 30px 0;">
              <a href="${appUrl}/dashboard/shared" 
                 style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Shared Snippets
              </a>
            </div>
            <p>Best regards,<br>The ClickMemory Team</p>
          </div>
        `
      })

      if (error) {
        console.error('Resend error:', error)
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 