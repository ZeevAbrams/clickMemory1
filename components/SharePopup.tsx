'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Snippet, Profile } from '@/types/database'
import { Mail, UserPlus, X, Check, AlertCircle } from 'lucide-react'
import { EmailService } from '@/lib/emailService'
import { useAuth } from '@/contexts/AuthContext'

interface SharePopupProps {
  snippet: Snippet
  isOpen: boolean
  onClose: () => void
  onShareSuccess: () => void
}

interface PendingShare {
  id: string
  snippet_id: string
  email: string
  permission: 'view' | 'edit'
  created_at: string
}

export default function SharePopup({ snippet, isOpen, onClose, onShareSuccess }: SharePopupProps) {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [loading, setLoading] = useState(false)
  const [userFound, setUserFound] = useState<Profile | null>(null)
  const [showInviteConfirm, setShowInviteConfirm] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)

  const handleEmailChange = async (emailValue: string) => {
    setEmail(emailValue)
    setUserFound(null)
    setShowInviteConfirm(false)
    setInviteSent(false)

    // Only check for user if email is complete and valid
    if (emailValue.trim() && emailValue.includes('@') && emailValue.includes('.') && emailValue.length > 5) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, display_name, created_at')
          .eq('email', emailValue.trim())
          .single()

        if (!error && data) {
          setUserFound(data)
        }
      } catch (error) {
        // User not found or query failed - this is expected for new users
        console.log('User not found in system, will show invite option')
      }
    }
  }

  const handleShare = async () => {
    if (!userFound) {
      setShowInviteConfirm(true)
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('shared_snippets')
        .insert([{
          snippet_id: snippet.id,
          shared_with_user_id: userFound.id,
          permission: permission
        }])

      if (error) {
        if (error.code === '23505') {
          alert('Snippet already shared with this user')
        } else {
          throw error
        }
      } else {
        setInviteSent(true)
        setTimeout(() => {
          handleShareSuccess()
        }, 1500)
      }
    } catch (error) {
      console.error('Error sharing snippet:', error)
      alert('Failed to share snippet')
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvite = async () => {
    setLoading(true)
    try {
      // Create pending share record
      const { error } = await supabase
        .from('pending_shares')
        .insert([{
          snippet_id: snippet.id,
          email: email.trim(),
          permission: permission
        }])

      if (error) {
        if (error.code === '23505') {
          alert('Invitation already sent to this email')
        } else {
          throw error
        }
      } else {
        // Send invitation email
        const emailSent = await EmailService.sendInvitation({
          to: email.trim(),
          snippetTitle: snippet.title,
          snippetId: snippet.id,
          permission: permission,
          inviterEmail: user?.email || 'Unknown'
        })

        if (emailSent) {
          setInviteSent(true)
          setTimeout(() => {
            handleShareSuccess()
          }, 1500)
        } else {
          alert('Failed to send invitation email')
        }
      }
    } catch (error) {
      console.error('Error sending invite:', error)
      alert('Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPermission('view')
    setUserFound(null)
    setShowInviteConfirm(false)
    setInviteSent(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleShareSuccess = () => {
    resetForm()
    onShareSuccess()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-3xl shadow-card border border-custom p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-text-primary">Share Snippet</h2>
          <button
            onClick={handleClose}
            className="text-secondary hover:text-primary transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {inviteSent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              {userFound ? 'Shared Successfully!' : 'Invitation Sent!'}
            </h3>
            <p className="text-secondary">
              {userFound 
                ? `"${snippet.title}" has been shared with ${userFound.email}`
                : `An invitation has been sent to ${email}`
              }
            </p>
          </div>
        ) : showInviteConfirm ? (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-start space-x-3">
                <UserPlus className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">User Not Found</h3>
                  <p className="text-blue-700 text-sm">
                    We couldn't find a user with the email <strong>{email}</strong>. 
                    Would you like to send them an invitation to join and view this snippet?
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-secondary mb-2">
                  Permission Level
                </label>
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
                  className="w-full px-4 py-3 border border-custom rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-text-primary"
                >
                  <option value="view">View Only</option>
                  <option value="edit">Can Edit</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowInviteConfirm(false)}
                  className="flex-1 px-4 py-3 border border-custom rounded-2xl text-secondary hover:bg-secondary-light transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendInvite}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-primary text-white rounded-2xl hover:bg-primary-hover disabled:opacity-50 transition-all font-semibold"
                >
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-secondary mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className="w-full px-4 py-3 border border-custom rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-text-primary placeholder-text-muted"
                placeholder="Enter email address"
              />
            </div>

            {userFound && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-green-600">
                      {userFound.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-green-900">{userFound.email}</p>
                    <p className="text-green-700 text-sm">User found in system</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="permission" className="block text-sm font-semibold text-secondary mb-2">
                Permission Level
              </label>
              <select
                id="permission"
                value={permission}
                onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
                className="w-full px-4 py-3 border border-custom rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-text-primary"
              >
                <option value="view">View Only</option>
                <option value="edit">Can Edit</option>
              </select>
            </div>

            <button
              onClick={handleShare}
              disabled={loading || !email.trim()}
              className="w-full px-4 py-3 bg-gradient-primary text-white rounded-2xl hover:bg-primary-hover disabled:opacity-50 transition-all font-semibold"
            >
              {loading ? 'Processing...' : (userFound ? 'Share Snippet' : 'Continue')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 