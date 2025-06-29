'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Snippet } from '@/types/database'
import { X, Check } from 'lucide-react'
import { EmailService } from '@/lib/emailService'
import { useAuth } from '@/contexts/AuthContext'
import { trackEvent } from '@/lib/posthog'

interface SharePopupProps {
  snippet: Snippet
  isOpen: boolean
  onClose: () => void
  onShareSuccess: () => void
}

export default function SharePopup({ snippet, isOpen, onClose, onShareSuccess }: SharePopupProps) {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [loading, setLoading] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)

  const handleSendInvite = async () => {
    if (!email.trim()) return

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
          return
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
          // Track successful invitation
          trackEvent('snippet_shared', {
            snippetId: snippet.id,
            snippetTitle: snippet.title,
            recipientEmail: email.trim(),
            permission: permission,
            emailSent: true
          })
          
          setInviteSent(true)
          setTimeout(() => {
            handleShareSuccess()
          }, 1500)
        } else {
          alert('Failed to send invitation email')
          
          // Track email failure
          trackEvent('snippet_share_email_failed', {
            snippetId: snippet.id,
            recipientEmail: email.trim(),
            permission: permission
          })
        }
      }
    } catch (error) {
      console.error('Error sending invite:', error)
      alert('Failed to send invitation')
      
      // Track error
      trackEvent('snippet_share_error', {
        snippetId: snippet.id,
        recipientEmail: email.trim(),
        permission: permission,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPermission('view')
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
              Invitation Sent!
            </h3>
            <p className="text-secondary">
              An invitation has been sent to {email}
            </p>
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
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-custom rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-text-primary placeholder-text-muted"
                placeholder="Enter email address"
              />
            </div>

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

            <div className="flex space-x-4">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-3 border border-custom rounded-2xl text-secondary hover:bg-secondary-light transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvite}
                disabled={loading || !email.trim()}
                className="flex-1 px-4 py-3 bg-gradient-primary text-white rounded-2xl hover:bg-primary-hover disabled:opacity-50 transition-all font-semibold"
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 