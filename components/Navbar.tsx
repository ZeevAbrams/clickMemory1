'use client'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, Plus } from 'lucide-react'
import Link from 'next/link'

export default function Navbar() {
  const { user, signOut } = useAuth()

  return (
    <nav className="bg-card shadow-card border-b border-custom backdrop-blur-sm">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center h-20">
          <Link href="/dashboard" className="text-2xl font-bold text-primary hover:text-primary-hover transition-colors">
            🧠 ClickMemory
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link
              href="/dashboard/new"
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-2xl shadow-glow text-sm font-semibold text-white bg-gradient-primary hover:bg-primary-hover hover-lift transition-all"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Snippet
            </Link>
            
            <span className="text-sm text-secondary font-medium">{user?.email}</span>
            
            <button
              onClick={signOut}
              className="inline-flex items-center px-4 py-2 border border-custom rounded-xl text-sm font-medium text-secondary bg-card hover:bg-secondary-light hover-lift transition-all shadow-card"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
} 