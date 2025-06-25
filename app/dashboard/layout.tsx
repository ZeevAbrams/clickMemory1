import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'

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
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
} 