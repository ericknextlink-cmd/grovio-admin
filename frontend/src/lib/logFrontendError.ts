/**
 * Sends a frontend error to the backend for server-side logging.
 * Silent: no user feedback, no throw. Used so devs can see errors in deployed platform logs.
 */
const getBackendUrl = (): string => {
  if (typeof window === 'undefined') return ''
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'https://grovio-backend.onrender.com'
  )
}

export function logFrontendError(
  error: Error,
  componentStack?: string
): void {
  const url = getBackendUrl()
  if (!url) return

  const payload = {
    message: error?.message ?? 'Unknown error',
    name: error?.name ?? 'Error',
    stack: error?.stack ?? undefined,
    componentStack: componentStack ?? undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location?.href : undefined,
    timestamp: new Date().toISOString(),
  }

  try {
    const body = JSON.stringify(payload)
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(`${url}/api/log-frontend-error`, blob)
    } else {
      fetch(`${url}/api/log-frontend-error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    // Ignore
  }
}
