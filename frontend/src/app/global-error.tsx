'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    const url =
      process.env.NEXT_PUBLIC_BACKEND_URL || 'https://grovio-backend.onrender.com'
    const payload = {
      message: error?.message ?? 'Unknown error',
      name: error?.name ?? 'Error',
      stack: error?.stack,
      url: typeof window !== 'undefined' ? window.location?.href : undefined,
      timestamp: new Date().toISOString(),
      source: 'global-error',
    }
    try {
      const body = JSON.stringify(payload)
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(`${url}/api/log-frontend-error`, new Blob([body], { type: 'application/json' }))
      } else {
        fetch(`${url}/api/log-frontend-error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {})
      }
    } catch {
      // ignore
    }
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>
              Oops, a problem occurred
            </p>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
              We couldn&apos;t foresee this. Don&apos;t fret — we&apos;ve been notified. Try again or head back home.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <a
                href="/admin"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                Return to home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
