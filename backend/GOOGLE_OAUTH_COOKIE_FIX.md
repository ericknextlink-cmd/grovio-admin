# Google OAuth Cookie Fix - PKCE Code Verifier Issue

## Problem Analysis

### Issue
```
Error exchanging code for session: AuthApiError: invalid request: 
both auth code and code verifier should be non-empty
```

### Root Cause
The PKCE code verifier cookie is **not being sent** when Google redirects back to the callback URL.

**Flow:**
1. Frontend calls `/api/auth/google` → Backend sets cookie with PKCE code verifier
2. Cookie set: `SameSite=lax, Secure=true`
3. Google redirects to `/api/auth/google/callback` → Cookie **NOT sent**

### Why This Happens

**`SameSite=lax` cookies are NOT sent on cross-site top-level navigations.**

When Google redirects back to our callback:
- It's a **third-party navigation** (Google → Your Backend)
- Browser sees it as a cross-site request
- `SameSite=lax` cookies are **blocked**

### Error Logs Show:
```
 Request cookie header present: false  // On callback
Request has cookies: false            // Cookie not received
```

---

## Solution

### Fix Applied

**Force `SameSite=None` for PKCE cookies in production:**

1. **Production**: Always use `SameSite=None; Secure=true` for OAuth cookies
2. **Development**: Detect if frontend/backend are on different origins
   - Different origins → `SameSite=None; Secure=true`
   - Same origin → `SameSite=lax; Secure=false`

### Changes Made

**File:** `backend/src/config/supabase.ts`

- Detects PKCE cookies (contains `code-verifier` or `auth-token`)
- Forces `SameSite=None` in production
- Automatically detects cross-domain in development
- Enhanced logging for debugging

---

## 🔧 Configuration Required

### Environment Variables

**Critical:** Ensure `NODE_ENV=production` is set in Railway!

```env
NODE_ENV=production  # REQUIRED for correct cookie settings
BACKEND_URL=https://grovio-admin-production.up.railway.app
FRONTEND_URL=https://grovio-gamma.vercel.app
```

### Railway Settings

1. **Go to Railway Dashboard**
2. **Select your backend service**
3. **Go to Variables tab**
4. **Add/Update:**
   - `NODE_ENV=production` ✅

---

## 🧪 Testing

### After Deployment

1. **Check logs** for cookie settings:
   ```
   Setting cookie: sb-xxx-auth-token-code-verifier
      - SameSite: none
      - Secure: true
      - Is PKCE: true
      - NODE_ENV: production
   ```

2. **Check callback logs:**
   ```
   Request has cookies: true
   Total cookies received: X
   PKCE-related cookies found: 1
   ```

3. **If still failing:**
   - Verify `NODE_ENV=production` in Railway
   - Check browser console for cookie warnings
   - Check if third-party cookies are blocked in browser

---

## 🚫 Non-Issues (Ignore These)

### ERR_BLOCKED_BY_CLIENT Errors

These are **NOT real errors**:
```
POST https://play.google.com/log?format=json net::ERR_BLOCKED_BY_CLIENT
```

**What they are:**
- Google Analytics/logging requests
- Blocked by ad blockers or privacy extensions
- **Safe to ignore** - they don't affect OAuth flow

---

## 📊 Cookie Behavior by SameSite

| SameSite | Cross-Site Redirect | Same-Site Request | Third-Party Redirect |
|----------|-------------------|-------------------|---------------------|
| `lax` | Not sent | Sent | Not sent |
| `none` | Sent | Sent | Sent (requires Secure) |
| `strict` | Not sent | Sent | Not sent |

**For OAuth:** We need `SameSite=None` because:
1. Google redirects from `accounts.google.com` (third party)
2. To our backend `grovio-admin-production.up.railway.app`
3. This is a **cross-site top-level navigation**
4. Only `SameSite=None` cookies are sent in this case

---

## Debugging

### Check Cookie Settings

**In browser DevTools:**
1. Open **Application** tab
2. Go to **Cookies** → Your backend domain
3. Look for cookies starting with `sb-` or containing `code-verifier`
4. Check:
   - `SameSite=None`
   - `Secure=true`
   - `HttpOnly=true`
   - Path: `/`
   - Not expired

### Check Backend Logs

**On OAuth initiation:**
```
Setting cookie: sb-xxx-auth-token-code-verifier
   - SameSite: none
   - Secure: true
   - Is PKCE: true
   - NODE_ENV: production
```

**On callback:**
```
Request has cookies: true
Total cookies received: X
PKCE-related cookies found: 1
PKCE cookie names: ['sb-xxx-auth-token-code-verifier']
```

---

## Summary

### Problem
- Cookie set with `SameSite=lax` → Not sent on Google redirect

### Solution
- Force `SameSite=None; Secure=true` for PKCE cookies in production

### Action Required
- Ensure `NODE_ENV=production` in Railway
- Redeploy backend
- Test OAuth flow

---

## 🔗 Related Files

- `backend/src/config/supabase.ts` - Cookie configuration
- `backend/src/services/auth.service.ts` - OAuth flow handlers
- `backend/src/controllers/auth.controller.ts` - OAuth endpoints

