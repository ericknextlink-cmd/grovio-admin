'use client'

import React from 'react'
import Link from 'next/link'
import { Home, RefreshCw } from 'lucide-react'
import { logFrontendError } from '@/lib/logFrontendError'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
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
    const isWalletError =
      error.message?.includes('toLowerCase') &&
      (error.message?.includes('selectedAddress') || error.message?.includes('ethereum'))

    if (isWalletError) {
      setTimeout(() => this.resetError(), 1000)
      return
    }

    logFrontendError(error, errorInfo?.componentStack ?? undefined)
    this.props.onError?.(error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent =
        (this.props.fallback as React.ComponentType<{ error?: Error; resetError: () => void }>) ||
        DefaultErrorFallback
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />
    }
    return this.props.children
  }
}

function DefaultErrorFallback({
  error,
  resetError,
}: {
  error?: Error
  resetError: () => void
}) {
  return (
    <div className="min-h-[280px] flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full text-center">
        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
          Oops, a problem occurred
        </p>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          We couldn&apos;t foresee this. Don&apos;t fret — we&apos;ve been notified. Try again or head
          back home.
        </p>
        {error?.message && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-6 font-mono truncate max-w-full px-2">
            {error.message}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetError}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            Return to home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ErrorBoundary
