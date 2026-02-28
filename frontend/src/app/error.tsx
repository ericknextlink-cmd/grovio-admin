'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Home, RefreshCw } from 'lucide-react'
import { logFrontendError } from '@/lib/logFrontendError'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logFrontendError(error, undefined)
  }, [error])

  return (
    <div className="min-h-[280px] flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full text-center">
        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
          Oops, a problem occurred
        </p>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          We could not foresee this. We have been notified. Try again or head back home.
        </p>
        {error?.message && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-6 font-mono truncate max-w-full px-2">
            {error.message}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
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
