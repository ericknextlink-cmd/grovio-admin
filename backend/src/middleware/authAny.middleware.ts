import { Request, Response, NextFunction } from 'express'
import { authenticateToken, type AuthRequest } from './auth.middleware'
import { AdminService } from '../services/admin.service'
import type { AuthenticatedAdminRequest } from './adminAuth.middleware'

/**
 * Authenticate either:
 * - Admin JWT (Bearer or admin_token cookie), OR
 * - User Supabase token/session (Bearer or cookies)
 *
 * Useful for endpoints shared between admin panel and user app.
 */
export async function authenticateAdminOrUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Try admin auth first if an admin token is present.
  try {
    let token: string | undefined
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
    if (!token && req.cookies?.admin_token) {
      token = req.cookies.admin_token
    }

    if (token) {
      const adminService = new AdminService()
      const decoded = adminService.verifyToken(token)
      if (decoded) {
        const admin = await adminService.getAdminById(decoded.adminId)
        if (admin && admin.is_active) {
          ;(req as AuthenticatedAdminRequest).adminId = decoded.adminId
          ;(req as AuthenticatedAdminRequest).adminUsername = decoded.username
          ;(req as AuthenticatedAdminRequest).adminRole = decoded.role
          next()
          return
        }
      }
    }
  } catch {
    // Ignore admin auth errors and fall back to user auth.
  }

  // Fall back to user auth.
  await authenticateToken(req as AuthRequest, res, next)
}

