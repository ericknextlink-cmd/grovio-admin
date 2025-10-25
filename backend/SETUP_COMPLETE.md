# ✅ Google Auth Setup Complete!

I've configured your backend to properly handle Google OAuth authentication. Here's what was done and how to use it.

---

## 🎉 What Was Fixed

### 1. **Environment Variable Handling**
- ✅ Added fallback support for both naming conventions:
  - `NEXT_PUBLIC_SUPABASE_URL` OR `SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` OR `SUPABASE_ANON_KEY`
- ✅ Added validation to throw clear errors if variables are missing
- ✅ Updated `backend/src/config/supabase.ts`

### 2. **Auto Port Detection**
- ✅ Server now automatically finds available ports
- ✅ Starts from port 3000, increments if busy (3001, 3002, etc.)
- ✅ Shows which port it's running on in console

### 3. **Comprehensive Documentation**
Created 4 detailed guides:

#### 📄 **GOOGLE_AUTH_README.md** (Main Entry Point)
- Overview of all documentation
- Quick reference for everything Google Auth

#### ⚡ **GOOGLE_AUTH_QUICKSTART.md** (5-Minute Setup)
- Copy-paste configuration
- Common errors and quick fixes
- Minimal steps to get working

#### 📖 **GOOGLE_AUTH_INTEGRATION.md** (Complete Guide)
- Step-by-step Supabase configuration
- Google Console setup
- Frontend integration examples (React, Next.js)
- Database schema
- Security best practices
- Production checklist

#### 🔍 **check-google-auth-setup.js** (Automated Checker)
- Validates environment variables
- Tests Supabase connectivity
- Checks if backend is running
- Provides clear error messages

---

## 🚀 How to Use (Quick Start)

### Step 1: Configure Environment Variables

Create `backend/.env`:

```bash
# Required - Get from https://supabase.com/dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional (has defaults)
FRONTEND_URL=http://localhost:3001
ADMIN_URL=http://localhost:3000
PORT=3000
```

### Step 2: Enable Google in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** and toggle it **ON**
5. (Optional) Add your Google OAuth Client ID & Secret
6. Click **Save**

### Step 3: Verify Configuration

```bash
cd backend
node check-google-auth-setup.js
```

You should see:
```
✅ Passed: X
⚠️  Warnings: Y
Configuration looks good!
```

### Step 4: Start Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
🚀 Grovio Backend Server running on port 3000
📝 Environment: development
🌐 Frontend URL: http://localhost:3001
⚡ Admin URL: http://localhost:3000
📡 Server URL: http://localhost:3000
```

### Step 5: Test the Endpoint

```bash
curl -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken": "test"}'
```

Expected response (error is good - endpoint works!):
```json
{
  "success": false,
  "message": "Google authentication failed",
  "errors": ["Invalid ID token"]
}
```

---

## 🎨 Frontend Integration

### ⭐ NEW: Server-Initiated OAuth (Recommended)

Your backend now supports **server-side OAuth** where the backend generates and handles the OAuth URL!

```typescript
// Step 1: Get OAuth URL from backend
const response = await fetch('http://localhost:3000/api/auth/google')
const data = await response.json()

// Step 2: Open popup or redirect to OAuth URL
if (data.success && data.url) {
  window.open(data.url, 'Google Sign In', 'width=600,height=700')
  // OR: window.location.href = data.url
}
```

**✅ See `GOOGLE_AUTH_SERVER_FLOW.md` for complete implementation guide!**

---

### Legacy Options

### Option A: Using Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xxxxx.supabase.co',
  'your_anon_key'
);

const handleGoogleSignIn = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
};
```

### Option B: Using @react-oauth/google

```bash
npm install @react-oauth/google
```

```typescript
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

// Wrap your app
<GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
  <App />
</GoogleOAuthProvider>

// Sign in button
const login = useGoogleLogin({
  onSuccess: async (tokenResponse) => {
    const res = await fetch('http://localhost:3000/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: tokenResponse.access_token })
    });
    
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('accessToken', data.accessToken);
      window.location.href = '/dashboard';
    }
  }
});

<button onClick={() => login()}>Sign in with Google</button>
```

---

## 🔧 API Endpoint Details

### Request Format

```http
POST /api/auth/google
Content-Type: application/json

{
  "idToken": "google_id_token_from_oauth",
  "nonce": "optional_random_nonce"
}
```

### Success Response (200)

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
  "accessToken": "jwt_token...",
  "refreshToken": "refresh_token..."
}
```

### Error Response (401)

```json
{
  "success": false,
  "message": "Google authentication failed",
  "errors": ["Invalid ID token"]
}
```

---

## 📚 Documentation Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| **GOOGLE_AUTH_README.md** | Overview & quick reference | Start here for overview |
| **GOOGLE_AUTH_QUICKSTART.md** | 5-minute setup guide | Need it working fast |
| **GOOGLE_AUTH_INTEGRATION.md** | Complete detailed guide | Want to understand everything |
| **check-google-auth-setup.js** | Configuration validator | Debugging issues |
| **API_DOCUMENTATION.md** | Full API documentation | Reference all endpoints |

---

## 🐛 Troubleshooting

### Common Issue 1: "Missing Supabase URL"

**Solution:**
```bash
# Verify .env file exists
ls backend/.env

# If missing, create it
cd backend
touch .env
# Add your environment variables
```

### Common Issue 2: "Google authentication failed"

**Checklist:**
- [ ] Google OAuth enabled in Supabase dashboard
- [ ] Environment variables set correctly
- [ ] Backend server running
- [ ] Frontend sending correct idToken (not access_token)
- [ ] Supabase URL is correct

**Quick Fix:**
```bash
# Run the configuration checker
cd backend
node check-google-auth-setup.js

# Restart backend server
npm run dev
```

### Common Issue 3: CORS Error from Frontend

**Solution:**

Verify in `backend/src/server.ts`:
```typescript
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    process.env.ADMIN_URL || 'http://localhost:3000'
  ],
  credentials: true
}))
```

Add your frontend URL to `.env`:
```bash
FRONTEND_URL=http://localhost:3001
```

### Common Issue 4: "Invalid ID token"

**Possible causes:**
- Token expired (Google tokens expire in 1 hour)
- Wrong token type (need ID token, not access token)
- Token from different Google Client ID

**Solution:**
- Generate a fresh token
- Verify you're using Supabase's `signInWithOAuth` or sending the correct ID token

---

## ✅ Checklist

Before integrating with frontend:

- [ ] `.env` file created with Supabase credentials
- [ ] Google OAuth enabled in Supabase
- [ ] Configuration checker passes: `node check-google-auth-setup.js`
- [ ] Backend server starts without errors: `npm run dev`
- [ ] Health endpoint works: `curl http://localhost:3000/api/health`
- [ ] Google auth endpoint responds: `curl -X POST http://localhost:3000/api/auth/google ...`

For production:

- [ ] All redirect URLs configured in Supabase
- [ ] All redirect URLs configured in Google Console
- [ ] Environment variables set in production
- [ ] HTTPS enabled
- [ ] CORS configured for production domains
- [ ] Error monitoring configured

---

## 🎯 What Happens During Auth

```
1. User clicks "Sign in with Google" on frontend
         ↓
2. Frontend: Google OAuth popup appears
         ↓
3. User authenticates with Google
         ↓
4. Frontend: Receives Google ID token
         ↓
5. Frontend: POST /api/auth/google with idToken
         ↓
6. Backend: Validates token with Supabase
         ↓
7. Backend: Checks if user exists in database
         ↓
8. Backend: Creates new user OR updates existing user
         ↓
9. Backend: Creates user preferences
         ↓
10. Backend: Returns user data + JWT tokens
         ↓
11. Frontend: Stores tokens, redirects to dashboard
```

---

## 📞 Need More Help?

1. **Quick Setup**: Read `GOOGLE_AUTH_QUICKSTART.md`
2. **Detailed Guide**: Read `GOOGLE_AUTH_INTEGRATION.md`
3. **Check Config**: Run `node check-google-auth-setup.js`
4. **API Reference**: See `API_DOCUMENTATION.md`
5. **Backend Logs**: Start server with `npm run dev` and watch console

---

## 🎉 You're All Set!

Your backend is now properly configured for Google OAuth authentication. The integration is:

✅ **Working** - Endpoint is ready at `POST /api/auth/google`  
✅ **Secure** - Using Supabase Auth for token validation  
✅ **Complete** - Handles new users, existing users, and profile updates  
✅ **Documented** - Multiple guides for different needs  
✅ **Testable** - Configuration checker and test scripts included  

**Next Step:** Integrate with your frontend using the examples above!

---

**Questions?** Check the documentation files or run the configuration checker for detailed troubleshooting.

**Happy Coding! 🚀**

