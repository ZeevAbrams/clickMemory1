import { NextRequest, NextResponse } from 'next/server'
import { trackServerEvent } from '@/lib/posthog'

export async function POST(request: NextRequest) {
  try {
    const { eventName, properties, userId } = await request.json()
    
    if (!eventName) {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 })
    }

    // Track the event using the correct function
    trackServerEvent(eventName, userId || 'anonymous', {
      source: 'extension',
      ...properties
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tracking error:', error)
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 })
  }
} 