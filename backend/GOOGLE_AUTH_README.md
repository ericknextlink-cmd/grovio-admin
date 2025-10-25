# Google Authentication - Complete Setup 🔐

This directory contains everything you need to implement Google OAuth authentication with your Grovio backend.

## 📚 Documentation Files

1. **[GOOGLE_AUTH_QUICKSTART.md](./GOOGLE_AUTH_QUICKSTART.md)** ⚡
   - **Start here!** 5-minute quick setup guide
   - Minimal configuration to get Google Auth working
   - Common errors and quick fixes
   - Perfect for: Getting it working FAST

2. **[GOOGLE_AUTH_INTEGRATION.md](./GOOGLE_AUTH_INTEGRATION.md)** 📖
   - Complete, detailed integration guide
   - Step-by-step Supabase and Google Console configuration
   - Frontend integration examples (React, Next.js)
   - Database schema, security best practices
   - Production deployment checklist
   - Perfect for: Understanding how everything works

3. **[check-google-auth-setup.js](./check-google-auth-setup.js)** 🔍
   - Automated configuration checker script
   - Validates environment variables
   - Tests Supabase connectivity
   - Checks if backend server is running
   - Perfect for: Debugging configuration issues

## 🚀 Quick Start (Copy-Paste)

### 1. Create .env file

```bash
cd backend
touch .env
```

Add these variables (get from [Supabase Dashboard](https://supabase.com/dashboard)):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

FRONTEND_URL=http://localhost:3001
PORT=3000
```

### 2. Enable Google in Supabase

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable **Google**
3. Save

### 3. Test Your Setup

```bash
# Install dependencies (if not already done)
npm install

# Run the configuration checker
node check-google-auth-setup.js

# Start the server
npm run dev
```

### 4. Test the Endpoint

```bash
curl -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken": "test"}'
```

You should see an error about invalid token (that's good - the endpoint works!)

## 🔧 What's Configured

The backend Google Auth implementation includes:

### ✅ Backend API Endpoint

- **Route**: `POST /api/auth/google`
- **Location**: `src/routes/auth.routes.ts`
- **Controller**: `src/controllers/auth.controller.ts`
- **Service**: `src/services/auth.service.ts`

### ✅ Features

- ✅ Validates Google ID tokens via Supabase
- ✅ Creates new users automatically
- ✅ Updates existing user profile pictures
- ✅ Returns JWT access & refresh tokens
- ✅ Stores user preferences
- ✅ Handles both new and returning users
- ✅ Extracts user info from Google (name, email, avatar)

### ✅ Database Integration

- ✅ Creates user in `users` table
- ✅ Creates user preferences in `user_preferences` table
- ✅ Stores Google ID for account linking
- ✅ Updates profile picture from Google avatar

### ✅ Security

- ✅ Token validation through Supabase
- ✅ Environment variable validation
- ✅ CORS configuration
- ✅ Rate limiting ready
- ✅ Service role key separation

## 📋 Request/Response Format

### Request

```http
POST /api/auth/google
Content-Type: application/json

{
  "idToken": "google_id_token_here",
  "nonce": "optional_nonce_for_security"
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Signed in with Google successfully",
  "user": {
    "id": "uuid",
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
  "accessToken": "jwt_token_here",
  "refreshToken": "refresh_token_here"
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

## 🎯 Frontend Integration

### Option A: Supabase Client (Recommended)

```typescript
import { supabase } from '@/lib/supabase';

const handleGoogleSignIn = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
};
```

### Option B: @react-oauth/google

```typescript
import { useGoogleLogin } from '@react-oauth/google';

const login = useGoogleLogin({
  onSuccess: async (tokenResponse) => {
    const res = await fetch('http://localhost:3000/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: tokenResponse.access_token })
    });
    const data = await res.json();
    // Handle success
  }
});
```

## 🐛 Troubleshooting

### Problem: "Missing Supabase URL"

**Solution:**
```bash
# Check if .env file exists
ls -la backend/.env

# If not, create it and add environment variables
cp backend/.env.template backend/.env
# Edit backend/.env with your values
```

### Problem: "Google authentication failed"

**Solution:**
1. Check Google OAuth is enabled in Supabase
2. Verify environment variables are correct
3. Run: `node check-google-auth-setup.js`
4. Restart backend server

### Problem: CORS Error

**Solution:**
```typescript
// Verify in backend/src/server.ts
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL
  ],
  credentials: true
}));
```

### Problem: "Invalid ID token"

**Solution:**
- Ensure frontend is sending the correct token type
- Token must be fresh (not expired)
- Google Client ID must match Supabase configuration

## 🧪 Testing

### 1. Test Environment

```bash
# Check configuration
node check-google-auth-setup.js

# Expected output:
# ✅ Passed: X
# ⚠️  Warnings: Y
# Configuration looks good!
```

### 2. Test Health Endpoint

```bash
curl http://localhost:3000/api/health
```

### 3. Test Google Auth Endpoint

```bash
curl -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken": "test_token"}'

# Expected: Error about invalid token (endpoint works!)
```

### 4. Integration Test

Use Postman, Insomnia, or your frontend to:
1. Get real Google ID token
2. Send to backend endpoint
3. Verify user is created in database
4. Verify tokens are returned

## 📊 Database Schema

Your `users` table should have:

```sql
- id (UUID, Primary Key)
- email (TEXT, Unique)
- first_name (TEXT)
- last_name (TEXT)
- profile_picture (TEXT)
- google_id (TEXT, Unique)
- is_email_verified (BOOLEAN)
- role (TEXT, default: 'customer')
- preferences (JSONB)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

## 🔐 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ Yes | Supabase anon key | `eyJhbG...` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Supabase service role | `eyJhbG...` |
| `FRONTEND_URL` | ⚠️ Optional | Frontend URL for CORS | `http://localhost:3001` |
| `PORT` | ⚠️ Optional | Server port | `3000` |

## 📝 Checklist

Before going to production:

- [ ] Environment variables configured
- [ ] Google OAuth enabled in Supabase
- [ ] Redirect URLs configured in Supabase
- [ ] Redirect URLs configured in Google Console
- [ ] Backend server starts without errors
- [ ] Configuration checker passes
- [ ] Test login works end-to-end
- [ ] Database schema matches expectations
- [ ] CORS configured for production domains
- [ ] HTTPS enabled
- [ ] Error monitoring configured

## 🆘 Need Help?

1. **Quick Help**: See [GOOGLE_AUTH_QUICKSTART.md](./GOOGLE_AUTH_QUICKSTART.md)
2. **Detailed Help**: See [GOOGLE_AUTH_INTEGRATION.md](./GOOGLE_AUTH_INTEGRATION.md)
3. **Debug**: Run `node check-google-auth-setup.js`
4. **Check Logs**: Start backend with `npm run dev` and watch for errors
5. **Check Supabase**: Dashboard → Logs → Auth Logs

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs/guides/auth/social-login/auth-google
- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2
- **Backend API Docs**: See `API_DOCUMENTATION.md`

---

**Last Updated:** October 2025  
**Tested With:** Node.js 20+, Supabase Auth v2, Google OAuth 2.0

