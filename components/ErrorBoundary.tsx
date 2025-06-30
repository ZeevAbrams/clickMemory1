'use client'
import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-secondary-light">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Something went wrong</h2>
            <p className="text-secondary mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <button
              onClick={this.resetError}
              className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
            >
              Try Again
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-muted">Error Details</summary>
                <pre className="mt-2 text-xs text-red-500 bg-red-50 p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Default fallback component
export function DefaultErrorFallback({ resetError }: { error?: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-secondary-light">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-text-primary mb-4">Something went wrong</h2>
        <p className="text-secondary mb-6">
          We encountered an unexpected error. Please try refreshing the page.
        </p>
        <button
          onClick={resetError}
          className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
} 