import crypto from 'crypto'

// In-memory store for CSRF tokens (in production, use Redis or database)
const csrfTokens = new Map<string, { token: string; expires: number }>()

export function generateCSRFToken(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = Date.now() + (30 * 60 * 1000) // 30 minutes
  
  csrfTokens.set(userId, { token, expires })
  
  // Clean up expired tokens
  cleanupExpiredTokens()
  
  return token
}

export function validateCSRFToken(userId: string, token: string): boolean {
  const stored = csrfTokens.get(userId)
  
  if (!stored) {
    return false
  }
  
  if (Date.now() > stored.expires) {
    csrfTokens.delete(userId)
    return false
  }
  
  if (stored.token !== token) {
    return false
  }
  
  // Remove token after successful validation (one-time use)
  csrfTokens.delete(userId)
  return true
}

function cleanupExpiredTokens() {
  const now = Date.now()
  for (const [userId, data] of csrfTokens.entries()) {
    if (now > data.expires) {
      csrfTokens.delete(userId)
    }
  }
}

// Clean up expired tokens every 5 minutes
setInterval(cleanupExpiredTokens, 5 * 60 * 1000) 