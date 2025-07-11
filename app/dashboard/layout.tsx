import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import PendingSharesNotification from '@/components/PendingSharesNotification'
import { ErrorBoundary, DefaultErrorFallback } from '@/components/ErrorBoundary'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary-light to-primary-light">
        <Navbar />
        <main className="container mx-auto px-6 py-10">
          <ErrorBoundary fallback={DefaultErrorFallback}>
            {children}
          </ErrorBoundary>
        </main>
        <PendingSharesNotification />
      </div>
    </ProtectedRoute>
  )
} 