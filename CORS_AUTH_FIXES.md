# CORS and Authentication Fixes

## Issues Fixed

### 1. **API_BASE_URL Empty String Issue** ✅
**Problem:** The frontend API client was using an empty string as fallback when `BACKEND_URL` wasn't set, causing requests to fail.

**Fix:** Updated `frontend/src/lib/api.ts` to:
- Check for `NEXT_PUBLIC_BACKEND_URL` first (available in browser)
- Fallback to deployed URL in production: `https://grovio-admin-production.up.railway.app`
- Fallback to `http://localhost:3002` in development

### 2. **Admin Dashboard Showing Mock Data** ✅
**Problem:** The admin dashboard (`/admin`) was displaying 3 hardcoded sample products from `adminStore` instead of fetching real data from the API.

**Fix:** Updated `frontend/src/app/admin/page.tsx` to:
- Fetch products from API using `productsApi.getAll()`
- Display loading and error states
- Handle create/update/delete operations through API calls
- Refresh products list after mutations

### 3. **CORS Configuration Issues** ✅
**Problem:** CORS was blocking localhost requests even though it was configured. The issue was with TypeScript types and the way origins were checked.

**Fix:** Updated `backend/src/server.ts` to:
- Properly type `allowedOrigins` as `(string | RegExp)[]`
- Filter out undefined values from environment variables
- In development (`NODE_ENV !== 'production'`), allow all localhost origins using regex: `/^http:\/\/localhost:\d+$/`
- Explicitly allow common ports: 3000, 3001, 3002
- Allow requests with no origin (for mobile apps, Postman, etc.)

### 4. **Signin Failing with 401 Error** ✅
**Problem:** Signin was failing because:
- The code was checking `public.users` table first (which might not exist)
- Then authenticating with Supabase Auth
- This created a race condition and incorrect error messages

**Fix:** Updated `backend/src/services/auth.service.ts` to:
- Authenticate with Supabase Auth **first** (validates password)
- Then check `public.users` using admin client (bypasses RLS)
- **Auto-create user profile** if user exists in `auth.users` but not in `public.users`
- This handles the edge case where signup failed partway through
- Removed duplicate authentication code

## Environment Variables Needed

### Frontend (`.env.local` or `.env`)
```bash
NEXT_PUBLIC_BACKEND_URL=https://grovio-admin-production.up.railway.app
# OR for local development:
# NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
```

### Backend (`.env`)
```bash
FRONTEND_URL=http://localhost:3001
ADMIN_URL=http://localhost:3000
NODE_ENV=production  # or development
```

## Testing

### Test CORS
```bash
# From localhost:3001
curl -X GET http://localhost:3002/api/health \
  -H "Origin: http://localhost:3001" \
  -v
```

### Test Signin
```bash
curl -X POST https://grovio-admin-production.up.railway.app/api/auth/signin \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3001" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test Admin Dashboard
1. Navigate to `/admin`
2. Should see products loading from API
3. Should display error if API fails
4. Should show real products from database

## Summary

✅ **Fixed API_BASE_URL** - Now has proper fallbacks  
✅ **Fixed Admin Dashboard** - Now fetches from API instead of mock data  
✅ **Fixed CORS** - Now allows localhost in development, proper TypeScript types  
✅ **Fixed Signin** - Auto-creates user profile if missing, better error handling  

All issues should now be resolved!

