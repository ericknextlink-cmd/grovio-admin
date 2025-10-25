# ✅ Server-Initiated Google OAuth Flow

## 🎯 The New Flow (Server-Side OAuth)

Your backend now supports **server-initiated OAuth** where the backend generates the OAuth URL and handles everything!

```
Frontend → Backend GET /api/auth/google → Returns OAuth URL → 
Frontend opens URL → User logs in with Google → 
Google redirects to Backend → Backend validates & creates session → 
Redirects to Frontend with tokens
```

---

## 🚀 Quick Setup

### Step 1: Add BACKEND_URL to .env

```bash
# backend/.env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# NEW: Backend URL for OAuth callback
BACKEND_URL=http://localhost:3000

# Frontend URL for redirects after auth
FRONTEND_URL=http://localhost:3001

PORT=3000
```

### Step 2: Configure Supabase Callback URL

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add to **Redirect URLs**:
   ```
   http://localhost:3000/api/auth/google/callback
   https://your-backend-domain.com/api/auth/google/callback
   ```

### Step 3: Restart Backend

```bash
cd backend
npm run dev
```

---

## 📡 API Endpoints

### 1. GET /api/auth/google - Initiate OAuth

**Request:**
```bash
GET http://localhost:3000/api/auth/google?redirectTo=/dashboard
```

**Response:**
```json
{
  "success": true,
  "message": "Google OAuth URL generated successfully",
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

### 2. GET /api/auth/google/callback - Handle Callback

**This endpoint is called by Google automatically**

After user authenticates, Google redirects to:
```
http://localhost:3000/api/auth/google/callback?code=xyz&scope=email+profile
```

Backend validates, creates session, then redirects to frontend:
```
http://localhost:3001/auth/callback?access_token=...&refresh_token=...
```

---

## 🎨 Frontend Integration

### Option A: Popup Window (Recommended)

```typescript
// components/GoogleSignIn.tsx
'use client'

import { useState } from 'react'

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setLoading(true)
    
    try {
      // Step 1: Get OAuth URL from backend
      const response = await fetch('http://localhost:3000/api/auth/google', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success && data.url) {
        // Step 2: Open popup with OAuth URL
        const width = 600
        const height = 700
        const left = window.screen.width / 2 - width / 2
        const top = window.screen.height / 2 - height / 2
        
        const popup = window.open(
          data.url,
          'Google Sign In',
          `width=${width},height=${height},left=${left},top=${top}`
        )
        
        // Step 3: Listen for callback
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return
          
          if (event.data.type === 'google-auth-success') {
            const { accessToken, refreshToken } = event.data
            
            // Store tokens
            localStorage.setItem('accessToken', accessToken)
            localStorage.setItem('refreshToken', refreshToken)
            
            // Close popup
            popup?.close()
            
            // Redirect to dashboard
            window.location.href = '/dashboard'
            
            // Cleanup
            window.removeEventListener('message', handleMessage)
          }
        }
        
        window.addEventListener('message', handleMessage)
      } else {
        alert('Failed to initiate Google sign in')
      }
    } catch (error) {
      console.error('Google sign in error:', error)
      alert('An error occurred during sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {loading ? 'Signing in...' : 'Sign in with Google'}
    </button>
  )
}
```

### Callback Handler (Frontend)

```typescript
// app/auth/callback/page.tsx
'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function AuthCallback() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const error = searchParams.get('error')
    
    if (error) {
      console.error('Auth error:', error)
      window.location.href = '/login?error=' + error
      return
    }
    
    if (accessToken && refreshToken) {
      // If opened in popup, send message to parent
      if (window.opener) {
        window.opener.postMessage({
          type: 'google-auth-success',
          accessToken,
          refreshToken
        }, window.location.origin)
        
        window.close()
      } else {
        // If opened in same window, store and redirect
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        window.location.href = '/dashboard'
      }
    } else {
      window.location.href = '/login?error=no_tokens'
    }
  }, [searchParams])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Completing authentication...</p>
    </div>
  )
}
```

---

### Option B: Full Page Redirect (Simpler)

```typescript
// components/GoogleSignIn.tsx
'use client'

import { useState } from 'react'

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setLoading(true)
    
    try {
      // Get OAuth URL from backend
      const response = await fetch('http://localhost:3000/api/auth/google')
      const data = await response.json()
      
      if (data.success && data.url) {
        // Redirect entire page to Google OAuth
        window.location.href = data.url
      } else {
        alert('Failed to initiate Google sign in')
        setLoading(false)
      }
    } catch (error) {
      console.error('Google sign in error:', error)
      alert('An error occurred during sign in')
      setLoading(false)
    }
  }

  return (
    <button onClick={handleGoogleSignIn} disabled={loading}>
      {loading ? 'Redirecting...' : 'Sign in with Google'}
    </button>
  )
}
```

With this approach, the callback page automatically stores tokens and redirects.

---

## 🔧 How It Works

### Step-by-Step Flow

1. **User clicks "Sign in with Google"**
   ```
   Frontend calls: GET /api/auth/google
   ```

2. **Backend generates OAuth URL**
   ```typescript
   // Backend generates URL like:
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=YOUR_CLIENT_ID&
     redirect_uri=http://localhost:3000/api/auth/google/callback&
     response_type=code&
     scope=email profile&
     access_type=offline
   ```

3. **Frontend opens OAuth URL**
   - In popup: `window.open(url)`
   - Or full redirect: `window.location.href = url`

4. **User authenticates with Google**
   - Google shows login page
   - User enters credentials
   - User grants permissions

5. **Google redirects to backend callback**
   ```
   GET http://localhost:3000/api/auth/google/callback?code=AUTH_CODE
   ```

6. **Backend exchanges code for tokens**
   - Validates the code with Supabase
   - Creates/updates user in database
   - Gets session tokens

7. **Backend redirects to frontend**
   ```
   Redirect to: http://localhost:3001/auth/callback?
     access_token=JWT_TOKEN&
     refresh_token=REFRESH_TOKEN
   ```

8. **Frontend stores tokens and redirects**
   - Saves to localStorage (or cookies)
   - Redirects to dashboard

---

## 🆚 Comparison with Old Flow

### Old Flow (Client-Initiated)
```
Frontend → Google (direct) → Gets ID token → 
POST /api/auth/google with token → Backend validates
```

**Issues:**
- Frontend must handle OAuth complexity
- Need to configure Google OAuth client on frontend
- Two-step process (get token, send to backend)

### New Flow (Server-Initiated)
```
Frontend → GET /api/auth/google → Opens OAuth URL → 
Google → Backend callback → Redirects with session
```

**Benefits:**
- ✅ Backend controls entire flow
- ✅ No OAuth libraries needed on frontend
- ✅ One-step process
- ✅ More secure (credentials only on backend)
- ✅ Works with popups or redirects

---

## 🧪 Testing

### Test the OAuth Initiation

```bash
curl http://localhost:3000/api/auth/google
```

**Expected response:**
```json
{
  "success": true,
  "message": "Google OAuth URL generated successfully",
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

### Test Full Flow

1. Visit the OAuth URL in browser
2. Log in with Google
3. Should redirect to: `http://localhost:3001/auth/callback?access_token=...`

---

## 🐛 Troubleshooting

### Issue: "Redirect URI mismatch"

**Solution:**

1. Check Supabase Dashboard → Authentication → URL Configuration
2. Ensure this URL is added:
   ```
   http://localhost:3000/api/auth/google/callback
   ```

### Issue: "BACKEND_URL is not defined"

**Solution:**

Add to `backend/.env`:
```bash
BACKEND_URL=http://localhost:3000
```

Restart backend:
```bash
npm run dev
```

### Issue: Popup blocked

**Solution:**

Modern browsers block popups unless triggered by user interaction. Make sure the `window.open()` call is directly in the click handler, not in an async callback.

### Issue: CORS error on callback

**Solution:**

The callback is server-to-server (Google → Backend), so CORS doesn't apply. If you see CORS errors, they're from the frontend trying to call the callback directly (which it shouldn't).

---

## 📋 Environment Variables

```bash
# Backend .env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# OAuth callback URL
BACKEND_URL=http://localhost:3000

# Where to redirect after auth
FRONTEND_URL=http://localhost:3001

PORT=3000
```

---

## 🚀 Production Setup

For production, update:

1. **Backend .env:**
   ```bash
   BACKEND_URL=https://api.yourdomain.com
   FRONTEND_URL=https://app.yourdomain.com
   ```

2. **Supabase Dashboard:**
   Add production callback URL:
   ```
   https://api.yourdomain.com/api/auth/google/callback
   ```

3. **Frontend API calls:**
   ```typescript
   const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
   fetch(`${BACKEND_URL}/api/auth/google`)
   ```

---

## 🎉 Summary

You now have **two ways** to authenticate with Google:

### 1. Server-Initiated OAuth (NEW - Recommended)
- **GET** `/api/auth/google` - Returns OAuth URL
- **GET** `/api/auth/google/callback` - Handles Google redirect
- Frontend opens URL, backend handles everything

### 2. ID Token Method (Legacy)
- **POST** `/api/auth/google` with `{ idToken: "..." }`
- Frontend gets token from Google, sends to backend

**Use the server-initiated flow** for cleaner, more secure authentication! 🎯

---

**Questions?** Check backend logs with `npm run dev` for detailed error messages.

