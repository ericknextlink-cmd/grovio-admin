import { Request, Response, NextFunction } from 'express'
import { AdminService } from '../services/admin.service'

export interface AuthenticatedAdminRequest extends Request {
  adminId: string
  adminUsername: string
  adminRole: string
}

/**
 * Middleware to authenticate admin requests
 */
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Try to get token from Authorization header first
    let token: string | undefined
    
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7) // Remove 'Bearer ' prefix
    }
    
    // If no token in header, try to get from cookie
    if (!token && req.cookies?.admin_token) {
      token = req.cookies.admin_token
    }
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      })
      return
    }
    
    const adminService = new AdminService()
    const decoded = adminService.verifyToken(token)

    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      })
      return
    }

    // Verify admin still exists and is active
    const admin = await adminService.getAdminById(decoded.adminId)
    
    if (!admin || !admin.is_active) {
      res.status(401).json({
        success: false,
        message: 'Admin account not found or inactive'
      })
      return
    }

    // Add admin info to request object
    ;(req as AuthenticatedAdminRequest).adminId = decoded.adminId
    ;(req as AuthenticatedAdminRequest).adminUsername = decoded.username
    ;(req as AuthenticatedAdminRequest).adminRole = decoded.role

    next()
  } catch (error) {
    console.error('Admin authentication error:', error)
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    })
  }
}

/**
 * Middleware to check if admin has super admin role
 */
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const adminRole = (req as AuthenticatedAdminRequest).adminRole

  if (adminRole !== 'super_admin') {
    res.status(403).json({
      success: false,
      message: 'Super admin access required'
    })
    return
  }

  next()
}
