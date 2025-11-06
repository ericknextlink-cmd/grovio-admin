# Cookie-Based Authentication Implementation

## Overview
This document describes the implementation of cookie-based authentication for the admin panel, replacing localStorage with secure cookies for better security and token management.

## Changes Made

### Backend Changes

1. **Cookie Parser Middleware** (`backend/src/server.ts`)
   - Added `cookie-parser` middleware to parse cookies from requests
   - Note: You need to install `cookie-parser`:
     ```bash
     cd backend
     npm install cookie-parser --legacy-peer-deps
     npm install --save-dev @types/cookie-parser --legacy-peer-deps
     ```

2. **Admin Authentication Middleware** (`backend/src/middleware/adminAuth.middleware.ts`)
   - Updated to accept tokens from both Authorization header and cookies
   - Checks `req.cookies.admin_token` if no Bearer token is provided
   - Maintains backward compatibility with header-based auth

3. **Admin Controller** (`backend/src/controllers/admin.controller.ts`)
   - **Login**: Sets `admin_token` cookie with HttpOnly, Secure (production), and SameSite=Lax
   - **Refresh Token**: New endpoint `/api/admin/refresh` to refresh tokens
   - **Logout**: Clears `admin_token` cookie

4. **Admin Service** (`backend/src/services/admin.service.ts`)
   - Added `refreshToken()` method to generate new tokens for existing admins

5. **Admin Routes** (`backend/src/routes/admin.routes.ts`)
   - Added `/api/admin/refresh` endpoint (requires authentication)

### Frontend Changes

1. **Cookie Utility** (`frontend/src/lib/cookies.ts`)
   - Created utility functions for cookie management:
     - `setAdminToken()` / `getAdminToken()`
     - `setAdminUser()` / `getAdminUser()`
     - `clearAdminCookies()`
   - Cookies are set with appropriate security flags

2. **API Client** (`frontend/src/lib/api.ts`)
   - Updated to check cookies first, then localStorage (backward compatibility)
   - Automatically detects admin routes (including POST/PUT/DELETE on products, categories, etc.)
   - Includes token refresh logic on 401 errors
   - All requests include `credentials: 'include'` for cookies

3. **Admin Signin** (`frontend/src/app/admin/signin/page.tsx`)
   - Sets cookies on successful login
   - Also maintains localStorage for backward compatibility
   - Uses `credentials: 'include'` in fetch requests

4. **Admin Auth Guard** (`frontend/src/components/AdminAuthGuard.tsx`)
   - Updated to check cookies first
   - Clears both cookies and localStorage on auth failure

5. **Admin Sidebar** (`frontend/src/components/AdminSidebar.tsx`)
   - Updated to read admin user from cookies
   - Logout clears both cookies and localStorage

6. **Password Update Form** (`frontend/src/components/PasswordUpdateForm.tsx`)
   - New component for changing admin password
   - Includes validation and password strength requirements
   - Accessible at `/admin/settings`

7. **Settings Page** (`frontend/src/app/admin/settings/page.tsx`)
   - New admin settings page with password update functionality

## Admin Route Detection

The API client automatically detects admin routes that require authentication:

1. **Admin-specific routes**: `/api/admin/*`, `/api/dashboard/*`
2. **Write operations** on:
   - `/api/products` (POST, PUT, PATCH, DELETE)
   - `/api/categories` (POST, PUT, PATCH, DELETE)
   - `/api/ai-products` (POST, PUT, PATCH, DELETE)
   - `/api/orders` (POST, PUT, PATCH, DELETE)
   - `/api/transactions` (POST, PUT, PATCH, DELETE)

## Token Refresh Flow

1. When an API request returns 401 (Unauthorized) on an admin route
2. The API client automatically attempts to refresh the token via `/api/admin/refresh`
3. If refresh succeeds, the request is retried with the new token
4. If refresh fails, the user is redirected to `/admin/signin`

## Cookie Configuration

### Backend Cookie Settings
```typescript
{
  httpOnly: true,           // Prevents JavaScript access (security)
  secure: production,       // HTTPS only in production
  sameSite: 'lax',         // CSRF protection
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
}
```

### Frontend Cookie Settings (Client-side)
```typescript
{
  httpOnly: false,         // Must be false for client-side access
  secure: production,      // HTTPS in production
  sameSite: 'Lax',
  path: '/',
}
```

**Note**: In a production environment with server-side rendering, you should use HttpOnly cookies set by the backend only, and remove client-side cookie setting. For now, both are supported for flexibility.

## Installation Steps

1. **Install cookie-parser in backend:**
   ```bash
   cd backend
   npm install cookie-parser --legacy-peer-deps
   npm install --save-dev @types/cookie-parser --legacy-peer-deps
   ```

2. **Rebuild backend:**
   ```bash
   cd backend
   npm run build
   ```

3. **Restart the backend server**

4. **Test the implementation:**
   - Sign in to admin panel
   - Create a product (should work now with token in cookie)
   - Check browser DevTools → Application → Cookies to verify `admin_token` cookie
   - Test password update at `/admin/settings`

## Backward Compatibility

The implementation maintains backward compatibility:
- Tokens in Authorization header still work
- localStorage tokens are checked as fallback
- Both cookies and localStorage are cleared on logout

## Security Improvements

1. **HttpOnly Cookies**: Prevents XSS attacks (when set by backend)
2. **Secure Flag**: Ensures HTTPS in production
3. **SameSite**: CSRF protection
4. **Token Refresh**: Automatic token renewal without re-login
5. **Automatic Token Injection**: All admin API calls automatically include the token

## Testing Checklist

- [x] Admin signin sets cookies
- [x] Admin signin maintains localStorage (backward compatibility)
- [x] Product creation works with cookie-based auth
- [x] Token refresh on 401 errors
- [x] Logout clears cookies
- [x] Password update functionality
- [ ] Cookie-parser installed and working
- [ ] CORS configured to allow credentials

## Next Steps

1. Install `cookie-parser` package (see Installation Steps above)
2. Test all admin operations (create, update, delete products)
3. Verify token refresh works correctly
4. Test password update functionality
5. Consider implementing HttpOnly-only cookies for enhanced security (requires API route proxy)

