'use client'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, Plus, Users, Settings } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <nav className="bg-card shadow-card border-b border-custom backdrop-blur-sm">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center h-20">
          <Link href="/dashboard" className="flex items-center space-x-3 text-2xl font-bold text-primary hover:text-primary-hover transition-colors">
            <img src="/FullImage_clickMemory.png" alt="ClickMemory Logo" className="h-10 w-10 object-contain" />
            <span>ClickMemory</span>
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link
              href="/dashboard/shared"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-secondary hover:text-primary hover:bg-primary-light rounded-xl transition-all"
            >
              <Users className="h-4 w-4 mr-2" />
              Shared With Me
            </Link>
            
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-secondary hover:text-primary hover:bg-primary-light rounded-xl transition-all"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
            
            <Link
              href="/dashboard/new"
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-2xl shadow-glow text-sm font-semibold text-white bg-gradient-primary hover:bg-primary-hover hover-lift transition-all"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Snippet
            </Link>
            
            <span className="text-sm text-secondary font-medium">{user?.email}</span>
            
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex items-center px-4 py-2 border border-custom rounded-xl text-sm font-medium text-secondary bg-card hover:bg-secondary-light hover-lift transition-all shadow-card disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isSigningOut ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
} 