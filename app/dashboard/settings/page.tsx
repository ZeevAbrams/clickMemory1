'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserApiKey } from '@/types/database'
import { Copy, Trash2, Key, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const { user } = useAuth()
  const [apiKeys, setApiKeys] = useState<UserApiKey[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('Chrome Extension')
  const [showApiKey, setShowApiKey] = useState<string | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)

  const generateCSRFToken = async () => {
    try {
      const response = await fetch('/api/csrf/generate', {
        method: 'GET',
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setCsrfToken(data.csrfToken)
      }
    } catch (error) {
      console.error('Error generating CSRF token:', error)
    }
  }

  const getSessionToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const loadApiKeys = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getSessionToken()
      const response = await fetch('/api/keys', {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.api_keys || [])
      }
    } catch (error) {
      console.error('Error loading API keys:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      generateCSRFToken()
      loadApiKeys()
    }
  }, [user, loadApiKeys])

  const generateApiKey = async () => {
    if (!csrfToken) {
      alert('Security token not available. Please refresh the page and try again.')
      return
    }

    setGenerating(true)
    try {
      const token = await getSessionToken()
      const response = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ name: newKeyName })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setShowApiKey(data.api_key)
        setNewKeyName('Chrome Extension')
        loadApiKeys()
        // Generate new CSRF token after successful operation
        generateCSRFToken()
      } else {
        alert('Failed to generate API key: ' + data.error)
      }
    } catch {
      alert('Error generating API key')
    } finally {
      setGenerating(false)
    }
  }

  const revokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This will immediately disable access for any Chrome extensions using this key.')) {
      return
    }

    try {
      const token = await getSessionToken()
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        loadApiKeys()
        // Generate new CSRF token after successful operation
        generateCSRFToken()
      } else {
        alert('Failed to revoke API key')
      }
    } catch {
      alert('Error revoking API key')
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
                disabled={generating || !csrfToken}
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
                      className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all flex items-center"
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
      </div>
    </div>
  )
} 