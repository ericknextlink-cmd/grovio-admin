# Google Authentication Integration Guide

This guide explains how to properly configure and integrate Google OAuth authentication with your Grovio backend.

## Overview

The backend uses **Supabase Auth** with Google OAuth provider. The authentication flow is:

1. **Frontend**: User clicks "Sign in with Google"
2. **Frontend**: Gets Google ID token from Google OAuth
3. **Frontend**: Sends ID token to backend API
4. **Backend**: Validates token with Supabase
5. **Backend**: Creates/updates user in database
6. **Backend**: Returns user data and session tokens

---

## Prerequisites

Before starting, you need:

1. ✅ Google Cloud Project with OAuth 2.0 credentials
2. ✅ Supabase project
3. ✅ Google OAuth configured in Supabase dashboard

---

## Step 1: Configure Environment Variables

### Backend `.env` File

Create a `.env` file in the `backend` directory with these variables:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend URLs (for CORS)
FRONTEND_URL=http://localhost:3001
ADMIN_URL=http://localhost:3000

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Configuration (optional, Supabase handles this)
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
```

### Important Notes:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (from Supabase dashboard → Settings → API)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon/public key (from Supabase dashboard → Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (from Supabase dashboard → Settings → API) - **Keep this secret!**

---

## Step 2: Configure Google OAuth in Supabase

### 2.1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   ```
   https://your-project.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback (for local development)
   ```
7. Save and copy your **Client ID** and **Client Secret**

### 2.2: Configure Supabase

1. Go to your Supabase dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and click **Enable**
4. Enter your Google OAuth credentials:
   - **Client ID**: Your Google OAuth Client ID
   - **Client Secret**: Your Google OAuth Client Secret
5. Add authorized redirect URLs in Supabase:
   ```
   http://localhost:3000
   http://localhost:3001
   https://yourdomain.com
   ```
6. **Save** the configuration

### 2.3: Update Supabase URL Configuration

1. In Supabase dashboard, go to **Authentication** → **URL Configuration**
2. Add these URLs to **Redirect URLs**:
   ```
   http://localhost:3000/*
   http://localhost:3001/*
   https://yourdomain.com/*
   ```

---

## Step 3: Backend API Endpoint

### Endpoint: `POST /api/auth/google`

**Access:** Public

**Request Body:**

```json
{
  "idToken": "google_id_token_from_oauth",
  "nonce": "optional_random_nonce_for_security"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Signed in with Google successfully",
  "user": {
    "id": "user_uuid",
    "email": "user@gmail.com",
    "firstName": "John",
    "lastName": "Doe",
    "profilePicture": "https://lh3.googleusercontent.com/...",
    "isEmailVerified": true,
    "role": "customer",
    "preferences": {
      "language": "en",
      "currency": "GHS"
    }
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_string"
}
```

**Error Response (401):**

```json
{
  "success": false,
  "message": "Google authentication failed",
  "errors": ["Invalid ID token"]
}
```

---

## Step 4: Frontend Integration

### Option A: Using @react-oauth/google (Recommended)

#### 4.1: Install Dependencies

```bash
npm install @react-oauth/google
# or
pnpm add @react-oauth/google
```

#### 4.2: Setup Google OAuth Provider

```typescript
// app/layout.tsx or _app.tsx
import { GoogleOAuthProvider } from '@react-oauth/google';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
```

#### 4.3: Implement Sign-In Button

```typescript
// components/GoogleSignInButton.tsx
'use client';

import { useGoogleLogin } from '@react-oauth/google';
import { useState } from 'react';

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError(null);

      try {
        // Send the access token to your backend
        const response = await fetch('http://localhost:3000/api/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: tokenResponse.access_token,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Store tokens
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          localStorage.setItem('user', JSON.stringify(data.user));

          // Redirect or update UI
          window.location.href = '/dashboard';
        } else {
          setError(data.message || 'Authentication failed');
        }
      } catch (err) {
        console.error('Google auth error:', err);
        setError('Failed to authenticate with Google');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError('Google login failed');
    },
  });

  return (
    <div>
      <button
        onClick={() => googleLogin()}
        disabled={loading}
        className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50"
      >
        {loading ? (
          'Signing in...'
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              {/* Google icon SVG */}
            </svg>
            Sign in with Google
          </>
        )}
      </button>
      {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
    </div>
  );
}
```

### Option B: Using Supabase Client (Alternative)

#### 4.1: Install Supabase Client

```bash
npm install @supabase/supabase-js
# or
pnpm add @supabase/supabase-js
```

#### 4.2: Create Supabase Client

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);
```

#### 4.3: Implement Google Sign-In

```typescript
// components/GoogleSignIn.tsx
'use client';

import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export function GoogleSignIn() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google sign-in error:', error);
        alert('Failed to sign in with Google');
      }
      // User will be redirected to Google
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="google-signin-button"
    >
      {loading ? 'Loading...' : 'Sign in with Google'}
    </button>
  );
}
```

#### 4.4: Create Callback Handler

```typescript
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Successfully authenticated
      // You can now sync with your backend if needed
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Authentication failed
  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
}
```

---

## Step 5: Testing the Integration

### 5.1: Test Backend Endpoint

Using cURL:

```bash
curl -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "YOUR_GOOGLE_ID_TOKEN"
  }'
```

Using Postman:
1. Create POST request to `http://localhost:3000/api/auth/google`
2. Set header: `Content-Type: application/json`
3. Set body (raw JSON):
   ```json
   {
     "idToken": "test_id_token_from_google"
   }
   ```

### 5.2: Check Backend Logs

Start your backend with:
```bash
cd backend
npm run dev
```

Look for these logs:
- ✅ `📦 Loading environment variables from: ...`
- ✅ `🚀 Grovio Backend Server running on port 3000`
- ❌ `Google auth error:` (if there's an issue)

### 5.3: Verify Database

After successful authentication, check your Supabase database:

1. Go to Supabase dashboard → **Table Editor**
2. Check `users` table for new user entry
3. Check `user_preferences` table for user preferences
4. Verify `profile_picture` is populated with Google avatar

---

## Troubleshooting

### Issue 1: "Google authentication failed"

**Possible Causes:**
- Google OAuth not enabled in Supabase
- Invalid Google Client ID/Secret
- Incorrect redirect URIs

**Solution:**
1. Verify Google OAuth is enabled in Supabase dashboard
2. Check Client ID and Secret are correct
3. Ensure redirect URIs match exactly (including http/https)

### Issue 2: "Invalid ID token"

**Possible Causes:**
- Frontend sending wrong token format
- Token expired
- Token from wrong Google Client

**Solution:**
1. Ensure you're sending the `id_token`, not `access_token`
2. Generate a fresh token
3. Verify Google Client ID matches Supabase configuration

### Issue 3: CORS Errors

**Possible Causes:**
- Backend not configured for frontend origin
- Missing CORS headers

**Solution:**

Check `backend/src/server.ts`:
```typescript
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    process.env.ADMIN_URL || 'http://localhost:3000'
  ],
  credentials: true
}))
```

### Issue 4: Environment Variables Not Loading

**Possible Causes:**
- `.env` file not in correct location
- Environment variables not properly named

**Solution:**
1. Ensure `.env` file is in `backend/` directory
2. Restart backend server after changing `.env`
3. Check logs for: `📦 Loading environment variables from: ...`

### Issue 5: "Failed to create user profile"

**Possible Causes:**
- Database schema issues
- Missing required fields
- RLS (Row Level Security) policies blocking insert

**Solution:**
1. Check database schema matches expectations
2. Verify RLS policies allow insert for authenticated users
3. Check Supabase logs for specific error

---

## Database Schema

Ensure your `users` table has these columns:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  country_code TEXT DEFAULT '+233',
  profile_picture TEXT,
  password_hash TEXT,
  is_email_verified BOOLEAN DEFAULT false,
  is_phone_verified BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'customer',
  google_id TEXT UNIQUE,
  preferences JSONB DEFAULT '{"language": "en", "currency": "GHS"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'en',
  currency TEXT DEFAULT 'GHS',
  family_size INTEGER,
  dietary_restrictions TEXT[],
  preferred_categories TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Security Best Practices

1. **Never expose service role key** to frontend
2. **Always validate tokens** on backend
3. **Use HTTPS** in production
4. **Implement rate limiting** on auth endpoints
5. **Store tokens securely** (httpOnly cookies preferred over localStorage)
6. **Implement CSRF protection** for sensitive operations
7. **Rotate secrets regularly**
8. **Monitor failed authentication attempts**

---

## Production Checklist

- [ ] Google OAuth Client ID and Secret configured
- [ ] Supabase Google provider enabled
- [ ] All redirect URLs added to both Google and Supabase
- [ ] Environment variables properly set
- [ ] CORS configured for production domains
- [ ] HTTPS enabled
- [ ] Rate limiting configured
- [ ] Error monitoring setup (Sentry, LogRocket, etc.)
- [ ] Database RLS policies reviewed
- [ ] Backup strategy in place

---

## Example Complete Flow

### Frontend Code

```typescript
// Sign in with Google
const signInWithGoogle = async () => {
  try {
    // Get Google ID token (using @react-oauth/google or Supabase)
    const idToken = await getGoogleIdToken();
    
    // Send to backend
    const response = await fetch('http://localhost:3000/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store tokens
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect
      router.push('/dashboard');
    }
  } catch (error) {
    console.error('Auth error:', error);
  }
};
```

### Backend Flow

1. ✅ Receive ID token
2. ✅ Validate with Supabase (`signInWithIdToken`)
3. ✅ Extract user metadata from Google
4. ✅ Check if user exists in database
5. ✅ Create new user OR update existing user
6. ✅ Create user preferences
7. ✅ Return user data and session tokens

---

## Need Help?

If you're still experiencing issues:

1. Check backend logs: `npm run dev` (look for error messages)
2. Check Supabase logs: Dashboard → Logs → Auth Logs
3. Verify all environment variables are set correctly
4. Test with a simple cURL request first
5. Check Google Cloud Console for OAuth errors

---

**Last Updated:** October 2025  
**Tested With:** Node.js 20+, Supabase Auth v2, React 18+

