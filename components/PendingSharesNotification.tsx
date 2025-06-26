'use client'
import { useAuth } from '@/contexts/AuthContext'
import { CheckCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function PendingSharesNotification() {
  const { pendingSharesAccepted, clearPendingSharesNotification } = useAuth()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (pendingSharesAccepted > 0) {
      setIsVisible(true)
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false)
        clearPendingSharesNotification()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [pendingSharesAccepted, clearPendingSharesNotification])

  if (!isVisible || pendingSharesAccepted === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 shadow-lg max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 mb-1">Snippets Added!</h3>
            <p className="text-green-700 text-sm">
              {pendingSharesAccepted === 1 
                ? '1 snippet has been added to your "Shared With Me" section.'
                : `${pendingSharesAccepted} snippets have been added to your "Shared With Me" section.`
              }
            </p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false)
              clearPendingSharesNotification()
            }}
            className="text-green-400 hover:text-green-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
} 