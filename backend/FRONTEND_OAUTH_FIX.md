# Frontend OAuth Fix - Cookie Persistence Issue

## Problem

Cookie set via AJAX/fetch response is **not persisting** when Google redirects back.

## Root Cause

1. Frontend calls `fetch('/api/auth/google')` → AJAX request
2. Backend sets cookie in AJAX response
3. Frontend opens popup to Google OAuth URL
4. Google redirects back → Cookie **NOT sent** (different navigation context)

## Solution

**Open backend endpoint directly in popup** instead of fetching it first.

### ❌ Wrong Way (Current):

```typescript
// DON'T DO THIS
const response = await fetch('/api/auth/google', { credentials: 'include' })
const { url } = await response.json()
const popup = window.open(url, 'Google Auth')  // Cookie not available
```

### ✅ Correct Way:

```typescript
// DO THIS INSTEAD
// Open backend endpoint directly - backend will redirect to Google
// Cookie will be set during navigation, making it available on callback
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
const popup = window.open(
  `${backendUrl}/api/auth/google?redirectTo=/dashboard`,
  'Google Auth',
  'width=500,height=600'
)
```

## Updated Frontend Code

### Hook Example:

```typescript
// hooks/useGoogleAuth.ts
export function useGoogleAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const frontendOrigin = new URL(window.location.origin).origin
      if (event.origin !== frontendOrigin && !event.origin.includes('localhost')) {
        return
      }

      if (event.data.type === 'grovio:google-auth') {
        setLoading(false)

        if (event.data.success && event.data.data.session) {
          const { session, user, redirectTo } = event.data.data
          
          // Store session
          localStorage.setItem('supabase_session', JSON.stringify(session))
          localStorage.setItem('user', JSON.stringify(user))
          localStorage.setItem('access_token', session.access_token)
          localStorage.setItem('refresh_token', session.refresh_token)

          // Redirect
          window.location.href = redirectTo || '/dashboard'
        } else {
          setError(event.data.data.errorDescription || 'Authentication failed')
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const initiateGoogleAuth = (redirectTo: string = '/dashboard') => {
    try {
      setLoading(true)
      setError(null)

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      
      // Open backend endpoint directly in popup
      // Backend will set cookie during navigation and redirect to Google
      const width = 500
      const height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const popup = window.open(
        `${backendUrl}/api/auth/google?redirectTo=${encodeURIComponent(redirectTo)}`,
        'Google Auth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      )

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      // Check if popup is closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          setLoading(false)
        }
      }, 1000)

    } catch (err: any) {
      setError(err.message || 'Failed to initiate Google authentication')
      setLoading(false)
    }
  }

  return { initiateGoogleAuth, loading, error }
}
```

## Why This Works

1. **Popup opens backend endpoint directly** → Navigation context (not AJAX)
2. **Backend sets cookie during navigation** → Cookie persists in navigation context
3. **Backend redirects to Google** → Cookie still available
4. **Google redirects back** → Cookie is sent (same navigation context)

## Backend Changes

The backend now detects navigation requests vs AJAX requests:

- **Navigation request** (Accept: text/html) → Redirects directly to Google
- **AJAX request** (fetch/XMLHttpRequest) → Returns JSON with URL

This ensures cookies work correctly for both use cases.

## Testing

After implementing:

1. Open popup to backend endpoint directly
2. Backend logs should show: `Redirecting directly to Google OAuth (navigation request)`
3. Cookie should be sent on callback
4. Check browser DevTools → Application → Cookies → Backend domain
5. Cookie should have: `SameSite=None, Secure=true, HttpOnly=true`

## Summary

**Change:** Instead of fetching the OAuth URL, open the backend endpoint directly in the popup window.

**Why:** Cookies set during navigation persist across redirects. Cookies set via AJAX may not.

