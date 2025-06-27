import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.json({ message: 'Cookies cleared' })
  
  // Clear the wrong Supabase cookie
  response.cookies.delete('sb-hjscpsaezewquywtluju-auth-token')
  
  return response
} 