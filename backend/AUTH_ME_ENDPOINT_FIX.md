# Auth /me Endpoint - Issue and Fix

## 🔍 **The Problem**

The `/api/auth/me` endpoint was returning:
```json
{
  "success": false,
  "message": "User not found",
  "errors": ["User profile not found"]
}
```

## 🎯 **Root Cause**

The error occurs in the `authenticateToken` middleware. Here's what's happening:

1. **JWT Token is Valid** - User exists in Supabase Auth (`auth.users`)
2. **User Profile Missing** - User doesn't exist in `public.users` table
3. **Middleware Rejects** - Returns "User profile not found" error

**This happens when:**
- User signed up but the profile creation in `public.users` failed
- Database transaction failed partway through signup
- Foreign key constraint issue prevented profile creation
- User was created manually in Supabase Auth but not in `public.users`

## **Proper Request Format**

The request format is **correct**:

```typescript
// Method: GET
// URL: https://grovio-admin-production.up.railway.app/api/auth/me
// Headers:
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

**Frontend API Client (already correct):**
```typescript
// frontend/src/lib/api.ts
const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
if (token) {
  config.headers = {
    ...config.headers,
    Authorization: `Bearer ${token}`,
  }
}
```

## 🔧 **What Was Fixed**

### 1. **Improved Middleware Error Handling**

Updated `backend/src/middleware/auth.middleware.ts`:
- Now uses `createAdminClient()` to bypass RLS when checking for user
- Better error logging for debugging
- Clearer error messages (404 vs 500)
- Distinguishes between "not found" vs other database errors

### 2. **Better Error Messages**

**Before:**
```json
{
  "success": false,
  "message": "User not found",
  "errors": ["User profile not found"]
}
```

**After:**
```json
{
  "success": false,
  "message": "User profile not found",
  "errors": ["Your account exists but profile data is missing. Please contact support or try signing up again."]
}
```

## 🛠️ **How to Fix the User's Account**

If a user has a valid JWT token but no profile in `public.users`, you need to:

### Option 1: Manual Fix (SQL)
```sql
-- Check if user exists in auth.users
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- If user exists, create profile in public.users
-- You'll need the user's ID from auth.users
INSERT INTO public.users (
  id,
  email,
  first_name,
  last_name,
  phone_number,
  country_code,
  role,
  password_hash,
  preferences
) VALUES (
  'user-id-from-auth-users',
  'user@example.com',
  'First',
  'Last',
  '+233241234567',
  '+233',
  'customer',
  NULL, -- No password hash for OAuth users
  '{"language": "en", "currency": "GHS"}'::jsonb
);

-- Create user preferences
INSERT INTO public.user_preferences (
  user_id,
  language,
  currency
) VALUES (
  'user-id-from-auth-users',
  'en',
  'GHS'
);
```

### Option 2: Re-signup
- Have the user sign up again (if email not already registered)
- Or delete the auth user and let them sign up fresh

### Option 3: Auto-recovery Endpoint (Future)
Create an endpoint that automatically creates the profile if missing:
```typescript
// POST /api/auth/recover-profile
// Creates public.users entry if user exists in auth.users but not in public.users
```

## 📊 **Testing the Endpoint**

### Using curl:
```bash
curl -X GET \
  https://grovio-admin-production.up.railway.app/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### Using JavaScript/Fetch:
```javascript
const token = localStorage.getItem('auth_token')

fetch('https://grovio-admin-production.up.railway.app/api/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log(data))
```

### Expected Success Response:
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+233241234567",
    "countryCode": "+233",
    "role": "customer",
    "preferences": {
      "language": "en",
      "currency": "GHS"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## 🔍 **Debugging Steps**

1. **Check if user exists in auth.users:**
   ```sql
   SELECT id, email, created_at FROM auth.users WHERE email = 'user@example.com';
   ```

2. **Check if user exists in public.users:**
   ```sql
   SELECT id, email, role FROM public.users WHERE email = 'user@example.com';
   ```

3. **Check backend logs:**
   - Look for "User profile not found in database" error logs
   - Check the userId and userEmail in the logs

4. **Verify token:**
   - Decode the JWT token (use jwt.io)
   - Check the `sub` field (should match user ID)
   - Verify token hasn't expired

## **Summary**

- **Request format is correct** - The frontend is sending the request properly
- **Middleware improved** - Better error handling and logging
- **Issue identified** - User exists in `auth.users` but not in `public.users`
- 🔧 **Action needed** - Create the missing profile in `public.users` table

The endpoint will work once the user profile is created in the `public.users` table!

