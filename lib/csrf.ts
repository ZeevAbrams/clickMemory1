import crypto from 'crypto'
import { supabaseAdmin } from './supabase'

/**
 * Creates a SHA-256 hash of a given token.
 * @param token The token to hash.
 * @returns The SHA-256 hash of the token.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Generates a CSRF token, stores its hash in the database, and returns the raw token.
 * The token is valid for 30 minutes.
 * @param userId The ID of the user for whom the token is generated.
 * @returns The raw, unhashed CSRF token.
 * @throws An error if the database operation fails.
 */
export async function generateCSRFToken(userId: string): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not initialized.')
  }

  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now

  const { error } = await supabaseAdmin
    .from('csrf_tokens')
    .insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    })

  if (error) {
    console.error('Error generating CSRF token:', error)
    throw new Error('Could not generate CSRF token due to a database error.')
  }

  return token
}

/**
 * Validates a CSRF token by comparing its hash with the stored hash in the database.
 * If valid, the token is deleted to ensure one-time use.
 * @param userId The ID of the user.
 * @param token The raw token received from the client.
 * @returns `true` if the token is valid, `false` otherwise.
 */
export async function validateCSRFToken(userId: string, token: string): Promise<boolean> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client is not initialized. Cannot validate CSRF token.')
    return false
  }
  if (!token) {
    return false
  }

  const tokenHash = hashToken(token)

  // First, find the token
  const { data: tokenData, error: selectError } = await supabaseAdmin
    .from('csrf_tokens')
    .select('id, expires_at')
    .eq('user_id', userId)
    .eq('token_hash', tokenHash)
    .single()

  if (selectError || !tokenData) {
    // No error logging needed here, as it's common for tokens not to be found.
    return false
  }

  // Check if the token is expired
  if (new Date(tokenData.expires_at) < new Date()) {
    // As a cleanup, delete the expired token record.
    await supabaseAdmin.from('csrf_tokens').delete().eq('id', tokenData.id);
    return false
  }

  // If the token is valid and not expired, delete it to ensure one-time use.
  const { error: deleteError } = await supabaseAdmin
    .from('csrf_tokens')
    .delete()
    .eq('id', tokenData.id)

  if (deleteError) {
    // Log the error, but still return true as validation itself succeeded.
    // The user's action should proceed. The token will be purged later by the cron job.
    console.error('Failed to delete CSRF token after validation:', deleteError)
  }

  return true
} 