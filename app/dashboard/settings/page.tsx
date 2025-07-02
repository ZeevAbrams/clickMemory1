'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSupabase } from '@/contexts/SupabaseContext'
import { UserApiKey } from '@/types/database'
import { Copy, Trash2, Key, AlertTriangle } from 'lucide-react'

export default function SettingsPage() {
  const { user, loading: authLoading, session } = useAuth()
  const { refreshSession } = useSupabase()
  const [apiKeys, setApiKeys] = useState<UserApiKey[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('Chrome Extension')
  const [showApiKey, setShowApiKey] = useState<string | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [isCsrfError, setIsCsrfError] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)

  const generateCSRFToken = useCallback(async () => {
    if (!user || !session) return;
    
    setIsCsrfError(false); // Reset error state on new attempt
    try {
      const token = session.access_token
      
      if (!token) {
        console.error('No session token available for CSRF generation')
        setIsCsrfError(true);
        return
      }

      const response = await fetch('/api/csrf/generate', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCsrfToken(data.csrfToken)
      } else {
        console.error('Failed to generate CSRF token, status:', response.status)
        setIsCsrfError(true);
        // Clear token to prevent use of a stale token
        setCsrfToken(null); 
      }
    } catch (error) {
      console.error('Error generating CSRF token:', error)
      setIsCsrfError(true);
    }
  }, [user, session])

  const loadApiKeys = useCallback(async () => {
    if (!user || !session) return
    
    setLoading(true)
    try {
      const token = session.access_token
      
      if (!token) {
        console.error('No session token available')
        return
      }
      
      const response = await fetch('/api/keys', {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.api_keys || [])
      } else if (response.status === 401) {
        console.log('Session expired while loading keys, attempting refresh...')
        const refreshedSession = await refreshSession()
        if (refreshedSession) {
          const retryResponse = await fetch('/api/keys', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${refreshedSession.access_token}` }
          })
          if (retryResponse.ok) {
            const data = await retryResponse.json()
            setApiKeys(data.api_keys || [])
          } else {
            console.error('Failed to load API keys after refresh')
          }
        } else {
          console.error('Failed to refresh session')
        }
      } else {
        console.error('Failed to load API keys:', response.status)
      }
    } catch (error) {
      console.error('Error loading API keys:', error)
    } finally {
      setLoading(false)
    }
  }, [user, session, refreshSession])

  useEffect(() => {
    if (!authLoading && user && session && !initialized && !isInitializing) {
      setIsInitializing(true)
      
      const initializePage = async () => {
        // Generate CSRF token first, as it's critical for all actions.
        await generateCSRFToken();
        // Then load non-critical data.
        await loadApiKeys();
        
        setInitialized(true);
        setIsInitializing(false);
      }
      
      initializePage();
    }
  }, [user, session, authLoading, initialized, isInitializing, generateCSRFToken, loadApiKeys])

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-3xl shadow-card border border-custom p-8">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-text-primary">Loading settings...</span>
          </div>
        </div>
      </div>
    )
  }

  // Show error if no user
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-3xl shadow-card border border-custom p-8">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">Authentication Required</h2>
            <p className="text-secondary">Please log in to access settings.</p>
          </div>
        </div>
      </div>
    )
  }

  const generateApiKey = async () => {
    if (!csrfToken || !session) {
      alert('A security token is missing. Please refresh the page and try again.')
      return
    }

    setGenerating(true)
    try {
      const token = session.access_token
      
      if (!token) {
        console.error('No session token available')
        setGenerating(false);
        return
      }
      
      const response = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ name: newKeyName })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setShowApiKey(data.api_key)
        setNewKeyName('Chrome Extension') // Reset form
        await loadApiKeys() // Refresh list
        await generateCSRFToken() // Generate new CSRF token for next action
      } else {
        alert('Failed to generate API key: ' + (data.error || 'Unknown error'))
        if (response.status === 401 || response.status === 403) {
          // If auth/CSRF fails, regenerate a new token for the next attempt.
          await generateCSRFToken();
        }
      }
    } catch {
      alert('An unexpected error occurred while generating the API key.')
    } finally {
      setGenerating(false)
    }
  }

  const revokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This will immediately disable access for any Chrome extensions using this key.')) {
      return
    }

    if (!csrfToken || !session) {
      alert('A security token is missing. Please refresh the page and try again.')
      return
    }

    try {
      const token = session.access_token
      
      if (!token) {
        console.error('No session token available')
        return
      }
      
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': csrfToken
        }
      })
      
      if (response.ok) {
        await loadApiKeys() // Refresh list
        await generateCSRFToken() // Generate new CSRF token for next action
      } else {
        const data = await response.json().catch(() => ({}));
        alert('Failed to revoke API key: ' + (data.error || 'Unknown error'))
        if (response.status === 401 || response.status === 403) {
          // If auth/CSRF fails, regenerate a new token for the next attempt.
          await generateCSRFToken();
        }
      }
    } catch {
      alert('An unexpected error occurred while revoking the API key.')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-3xl shadow-card border border-custom p-8">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Settings</h1>
        
        {/* Chrome Extension Setup */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-text-primary mb-6 flex items-center">
            <Key className="h-6 w-6 mr-3 text-primary" />
            Chrome Extension Setup
          </h2>
          
          <div className="bg-card border border-custom rounded-xl p-6 mb-6">
            <h3 className="font-semibold mb-3 text-text-primary">Generate API Key</h3>
            <p className="text-secondary mb-4 leading-relaxed">
              Create an API key to connect your Chrome extension to ClickMemory. This key will allow the extension to securely access your snippets.
            </p>
            
            <div className="flex items-center gap-3 mb-4">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="API Key Name"
                className="flex-1 px-4 py-3 bg-card border border-custom rounded-xl text-text-primary placeholder-text-muted focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
              <button
                onClick={generateApiKey}
                disabled={generating || isCsrfError || !csrfToken}
                className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  'Generate Key'
                )}
              </button>
            </div>
            
            {showApiKey && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold mb-3 text-green-400">API Key Generated!</h3>
                <p className="text-green-300 mb-4 leading-relaxed">
                  Copy this key and paste it into your Chrome extension. Keep it secure - you won&apos;t be able to see it again.
                </p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 bg-card px-4 py-3 rounded-xl border border-custom text-sm font-mono break-all text-text-primary">
                    {showApiKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(showApiKey)}
                    className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center transition-all"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </button>
                </div>
                <button
                  onClick={() => setShowApiKey(null)}
                  className="mt-4 text-green-400 hover:text-green-300 text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
            <h3 className="font-semibold mb-3 flex items-center text-yellow-400">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Security Notice
            </h3>
            <ul className="text-sm text-yellow-300 space-y-2">
              <li>• Keep your API key secure and don&apos;t share it with anyone</li>
              <li>• You can revoke API keys at any time from this page</li>
              <li>• API keys are used for read-only access to your snippets</li>
              <li>• Keys automatically expire after 1 year for security</li>
            </ul>
          </div>

          {/* API Keys List */}
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-6">Your API Keys</h2>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8 text-secondary">
                <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No API keys generated yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div key={key.id} className="bg-card border border-custom rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-text-primary">{key.name}</h3>
                      <p className="text-sm text-secondary">
                        Created: {new Date(key.created_at).toLocaleDateString()}
                        {key.last_used_at && ` • Last used: ${new Date(key.last_used_at).toLocaleDateString()}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded text-xs ${key.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {key.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {key.expires_at && (
                          <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">
                            Expires: {new Date(key.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => revokeApiKey(key.id)}
                      disabled={isCsrfError}
                      className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Terms and Privacy Links */}
        <div className="text-center mt-12 pt-8 border-t border-custom/20">
          <div className="flex justify-center items-center gap-6 text-xs text-secondary">
            <a 
              href="/terms" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Terms & Conditions
            </a>
            <span className="text-custom/40">•</span>
            <a 
              href="/privacy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 