# Google Auth Quick Start Guide 🚀

**For impatient developers who just want it to work!**

## 🎯 Quick Setup (5 minutes)

### 1. Environment Variables (2 min)

Create `backend/.env`:

```bash
# Copy this EXACTLY and replace the values
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

FRONTEND_URL=http://localhost:3001
ADMIN_URL=http://localhost:3000
PORT=3000
```

**Where to get these?**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Click your project → Settings → API
- Copy the values

### 2. Enable Google in Supabase (2 min)

1. Supabase Dashboard → Authentication → Providers
2. Find "Google" → Toggle ON
3. Add redirect URL: `https://xxxxx.supabase.co/auth/v1/callback`
4. Save

### 3. Configure Google OAuth (1 min)

**Quick Option:**  
Use Supabase's managed Google OAuth (no Google Console setup needed!)

**OR**

**Custom Option:**
1. [Google Console](https://console.cloud.google.com/) → Create Project
2. APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Add redirect: `https://xxxxx.supabase.co/auth/v1/callback`
4. Copy Client ID & Secret to Supabase

### 4. Test It! (30 seconds)

```bash
cd backend
npm run dev

# In another terminal
curl -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken": "test"}'
```

You should see an error about invalid token (that's good! The endpoint works)

---

## 🎨 Frontend Integration

### React + @react-oauth/google

```bash
npm install @react-oauth/google
```

```tsx
// 1. Wrap your app
import { GoogleOAuthProvider } from '@react-oauth/google';

function App() {
  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      {/* your app */}
    </GoogleOAuthProvider>
  );
}

// 2. Add button
import { useGoogleLogin } from '@react-oauth/google';

function SignInButton() {
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

  return <button onClick={() => login()}>Sign in with Google</button>;
}
```

---

## ❌ Common Errors & Fixes

### "Google authentication failed"

**Fix:**
1. Check Google OAuth is enabled in Supabase
2. Verify environment variables are loaded
3. Restart backend server

### "Missing Supabase URL"

**Fix:**
```bash
# Make sure .env exists in backend/ directory
cd backend
ls -la .env

# If not, create it with required vars
```

### CORS Error

**Fix:**
```typescript
// backend/src/server.ts - Should already have this
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}))
```

### "Invalid ID token"

**Fix:**
Frontend should send the ID token, not access token:

```typescript
// ❌ WRONG
body: JSON.stringify({ idToken: tokenResponse.access_token })

// ✅ CORRECT - Use Supabase client instead
const { data } = await supabase.auth.signInWithOAuth({
  provider: 'google'
});
```

---

## 🔍 Debug Checklist

Run through this if something's not working:

- [ ] `.env` file exists in `backend/` directory
- [ ] Environment variables are loaded (check server logs on startup)
- [ ] Supabase URL and keys are correct (no typos)
- [ ] Google OAuth enabled in Supabase dashboard
- [ ] Backend server is running on correct port
- [ ] Frontend can reach backend (no CORS errors)
- [ ] Using correct token (ID token, not access token)

---

## 📱 Test with Postman

1. Create new POST request
2. URL: `http://localhost:3000/api/auth/google`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "idToken": "your_google_id_token_here"
}
```

---

## 🎓 Understanding the Flow

```
User clicks "Sign in with Google"
         ↓
Frontend: Get Google ID token
         ↓
Frontend: POST to /api/auth/google with idToken
         ↓
Backend: Validate token with Supabase
         ↓
Backend: Create/update user in database
         ↓
Backend: Return user data + access token
         ↓
Frontend: Store tokens, redirect to dashboard
```

---

## 💡 Pro Tips

1. **Use Supabase's managed OAuth** - It's easier and already configured
2. **Test backend endpoint first** - Before integrating frontend
3. **Check logs** - Backend logs show exactly what's failing
4. **Use httpOnly cookies** - Instead of localStorage for tokens (more secure)

---

## 🆘 Still Not Working?

1. **Check backend logs:**
   ```bash
   cd backend
   npm run dev
   # Look for error messages
   ```

2. **Check Supabase logs:**
   - Dashboard → Logs → Auth Logs
   - Look for failed auth attempts

3. **Verify database:**
   - Dashboard → Table Editor → users
   - Check if test users are being created

4. **Test with cURL:**
   ```bash
   # Test health endpoint first
   curl http://localhost:3000/api/health
   
   # Then test Google auth endpoint
   curl -X POST http://localhost:3000/api/auth/google \
     -H "Content-Type: application/json" \
     -d '{"idToken": "test"}'
   ```

---

## 📚 Need More Details?

See the complete guide: `GOOGLE_AUTH_INTEGRATION.md`

---

**Questions?** Check the full documentation or the backend logs - they tell you exactly what's wrong!

