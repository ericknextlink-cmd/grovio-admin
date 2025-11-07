import { Request, Response, NextFunction } from 'express'
import { createClient, createAdminClient } from '../config/supabase'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
  }
}

/**
 * Middleware to authenticate user using Supabase JWT token
 */
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
        errors: ['Missing authorization token']
      })
    }

    const supabase = createClient()

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        errors: ['Authentication failed']
      })
    }

    // Get user data from our database using admin client to bypass RLS
    const adminSupabase = createAdminClient()
    const { data: userData, error: dbError } = await adminSupabase
      .from('users')
      .select('id, email, role')
      .eq('id', user.id)
      .single()

    if (dbError || !userData) {
      // Log the error for debugging
      console.error('User profile not found in database:', {
        userId: user.id,
        userEmail: user.email,
        dbError: dbError?.message,
        code: dbError?.code
      })

      // Check if it's a "not found" error (PGRST116) vs other errors
      if (dbError?.code === 'PGRST116' || !userData) {
        // User exists in auth.users but not in public.users
        // This can happen if signup failed partway through
        return res.status(404).json({
          success: false,
          message: 'User profile not found',
          errors: ['Your account exists but profile data is missing. Please contact support or try signing up again.']
        })
      }

      // Other database errors
      return res.status(500).json({
        success: false,
        message: 'Database error',
        errors: ['Failed to retrieve user profile']
      })
    }

    // Add user info to request object
    req.user = {
      id: userData.id,
      email: userData.email,
      role: userData.role
    }

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      errors: ['Authentication service error']
    })
  }
}

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errors: ['Please sign in']
    })
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      errors: ['Insufficient permissions']
    })
  }

  next()
}

/**
 * Middleware to check if user is customer or admin
 */
export const requireUser = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errors: ['Please sign in']
    })
  }

  if (!['customer', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'User access required',
      errors: ['Invalid user role']
    })
  }

  next()
}

/**
 * Alias for authenticateToken - for consistency
 */
export const authenticateUser = authenticateToken

/**
 * Extended request interface with userId for convenience
 */
export interface UserRequest extends Request {
  userId?: string
  user?: {
    id: string
    email: string
    role: string
  }
}
