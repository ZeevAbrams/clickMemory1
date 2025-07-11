// Input validation and sanitization utilities

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedValue?: string
}

export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  // Remove null bytes and control characters
  return input
    .replace(/\0/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
}

export function validateTitle(title: string): ValidationResult {
  const errors: string[] = []
  const sanitized = sanitizeString(title)
  
  if (!sanitized) {
    errors.push('Title is required')
  } else if (sanitized.length > 100) {
    errors.push('Title must be 100 characters or less')
  } else if (sanitized.length < 1) {
    errors.push('Title must be at least 1 character')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized
  }
}

export function validateContent(content: string): ValidationResult {
  const errors: string[] = []
  const sanitized = sanitizeString(content)
  
  if (!sanitized) {
    errors.push('Content is required')
  } else if (sanitized.length > 10000) {
    errors.push('Content must be 10,000 characters or less')
  } else if (sanitized.length < 1) {
    errors.push('Content must be at least 1 character')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized
  }
}

export function validateSystemRole(systemRole: string): ValidationResult {
  const errors: string[] = []
  const sanitized = sanitizeString(systemRole)
  
  if (sanitized && sanitized.length > 80) {
    errors.push('System role must be 80 characters or less')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized
  }
}

export function validateApiKey(apiKey: string): ValidationResult {
  const errors: string[] = []
  const sanitized = sanitizeString(apiKey)
  
  if (!sanitized) {
    errors.push('API key is required')
  } else if (!sanitized.startsWith('sk_live_')) {
    errors.push('API key must start with sk_live_')
  } else if (sanitized.length !== 72) {
    errors.push('API key must be 72 characters long')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized
  }
}

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = []
  const sanitized = sanitizeString(email)
  
  if (!sanitized) {
    errors.push('Email is required')
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(sanitized)) {
      errors.push('Please enter a valid email address')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized
  }
}

export function validateSnippetData(data: {
  title: string
  content: string
  system_role?: string
}): ValidationResult {
  const errors: string[] = []
  
  const titleValidation = validateTitle(data.title)
  if (!titleValidation.isValid) {
    errors.push(...titleValidation.errors)
  }
  
  const contentValidation = validateContent(data.content)
  if (!contentValidation.isValid) {
    errors.push(...contentValidation.errors)
  }
  
  if (data.system_role) {
    const systemRoleValidation = validateSystemRole(data.system_role)
    if (!systemRoleValidation.isValid) {
      errors.push(...systemRoleValidation.errors)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: JSON.stringify({
      title: titleValidation.sanitizedValue,
      content: contentValidation.sanitizedValue,
      system_role: data.system_role ? validateSystemRole(data.system_role).sanitizedValue : ''
    })
  }
}

// XSS prevention - escape HTML entities
export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// SQL injection prevention - basic check for suspicious patterns
export function containsSqlInjection(text: string): boolean {
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script)\b)/i,
    /(\b(or|and)\b\s+\d+\s*=\s*\d+)/i,
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b\s+.*\bfrom\b)/i,
    /(--|\/\*|\*\/|;)/,
    /(\bxp_|sp_|sysobjects|syscolumns)/i
  ]
  
  return sqlPatterns.some(pattern => pattern.test(text))
}

// Timeout utility to prevent hanging requests
export const withTimeout = <T>(promise: Promise<T>, ms: number = 10000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms)
    )
  ])
}

// Database timeout wrapper
export const withDatabaseTimeout = <T>(promise: Promise<T>, ms: number = 5000): Promise<T> => {
  return withTimeout(promise, ms)
}

import { NextRequest } from 'next/server';
import { validateCSRFToken } from './csrf';
import { supabaseAdmin } from './supabase';

interface AuthResult {
  user: { id: string; email?: string } | null;
  error: string | null;
}

/**
 * A middleware-like function to validate both the user's JWT and a CSRF token.
 * This centralizes the authentication and CSRF protection logic for API routes.
 *
 * @param request The incoming NextRequest.
 * @returns A promise that resolves to an object containing the user or an error.
 */
export async function validateRequest(request: NextRequest): Promise<AuthResult> {
  // 1. Validate JWT from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Authorization header with Bearer token required' };
  }
  const token = authHeader.replace('Bearer ', '');
  
  if (!supabaseAdmin) {
    return { user: null, error: 'Service configuration error' };
  }
  
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return { user: null, error: 'Invalid or expired token. Please log in again.' };
  }

  // 2. Validate CSRF token from X-CSRF-Token header
  const csrfToken = request.headers.get('X-CSRF-Token');
  if (!csrfToken) {
    return { user: null, error: 'CSRF token is missing.' };
  }

  const isCsrfValid = await validateCSRFToken(user.id, csrfToken);
  if (!isCsrfValid) {
    return { user: null, error: 'Invalid CSRF token.' };
  }

  // 3. If both are valid, return the user
  return { user, error: null };
} 