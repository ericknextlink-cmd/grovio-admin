/**
 * Cookie utility functions for client-side token management
 * Uses HttpOnly cookies for security (handled by Next.js API routes)
 * For client-side access, we'll use document.cookie as fallback
 */

const COOKIE_OPTIONS = {
  admin_token: {
    name: 'admin_token',
    maxAge: 60 * 60 * 24, // 24 hours in seconds
    httpOnly: false, // Must be false for client-side access, but consider HttpOnly for production
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  },
  admin_user: {
    name: 'admin_user',
    maxAge: 60 * 60 * 24, // 24 hours
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  },
}

/**
 * Set a cookie on the client side
 */
export function setCookie(name: string, value: string, days: number = 1): void {
  if (typeof window === 'undefined') return

  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  const expires = `expires=${date.toUTCString()}`
  
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  const sameSite = '; SameSite=Lax'
  
  document.cookie = `${name}=${value}; ${expires}; path=/${secure}${sameSite}`
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null

  const nameEQ = `${name}=`
  const ca = document.cookie.split(';')
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) {
      return c.substring(nameEQ.length, c.length)
    }
  }
  
  return null
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string): void {
  if (typeof window === 'undefined') return
  
  setCookie(name, '', -1)
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

/**
 * Set admin token cookie
 */
export function setAdminToken(token: string): void {
  setCookie(COOKIE_OPTIONS.admin_token.name, token, 1) // 1 day
}

/**
 * Get admin token from cookie
 */
export function getAdminToken(): string | null {
  return getCookie(COOKIE_OPTIONS.admin_token.name)
}

/**
 * Set admin user info cookie
 */
export function setAdminUser(user: any): void {
  setCookie(COOKIE_OPTIONS.admin_user.name, JSON.stringify(user), 1)
}

/**
 * Get admin user from cookie
 */
export function getAdminUser(): any | null {
  const userStr = getCookie(COOKIE_OPTIONS.admin_user.name)
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * Clear all admin cookies
 */
export function clearAdminCookies(): void {
  deleteCookie(COOKIE_OPTIONS.admin_token.name)
  deleteCookie(COOKIE_OPTIONS.admin_user.name)
}

